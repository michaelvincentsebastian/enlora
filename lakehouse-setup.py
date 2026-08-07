import boto3
import duckdb
import psycopg2
from botocore.exceptions import ClientError
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import time

# --- KONFIGURASI ---
PG_CONFIG = {
    "host": "localhost",
    "port": "5432",
    "user": "postgres",
    "password": "postgres"
}

MINIO_CONFIG = {
    "endpoint_url": "http://localhost:9000",
    "aws_access_key_id": "minioadmin",
    "aws_secret_access_key": "minioadmin",
    "use_ssl": False,
    "verify": False
}

NAME_BUCKET = 'lake'
METADATA_BUCKET_NAME = 'metadata'

# Nama database Postgres yang dipakai di project ini
METADATA_DB_NAME  = "unstructure_metadata"   # metadata file yang diupload via web (title, source, tags, dll)
SQLMESH_DB_NAME   = "sqlmesh_state_db"       # state internal SQLMesh
DUCKLAKE_DB_NAME  = "metadata_db"            # metadata catalog DuckLake (terpisah dari unstructure_metadata)

# Attach Ducklake --> Lakehouse Setup.
metadata_conn = f"dbname={DUCKLAKE_DB_NAME} host=localhost user=postgres password=postgres port=5432"
data_lake_path = f"s3://{NAME_BUCKET}/"
    
metadata_of_metadata = f"dbname={METADATA_DB_NAME} host=localhost user=postgres password=postgres port=5432"
minio_location = f"s3://{METADATA_BUCKET_NAME}/"

# --- KONEKSI S3 (MinIO) ---
s3_client = boto3.client('s3', **MINIO_CONFIG)

# --- FUNGSI HELPER POSTGRES ---
def run_pg_admin_query(sql):
    """Menjalankan query DDL (Create/Drop DB) menggunakan mode Autocommit"""
    # Koneksi ke database default 'postgres' untuk melakukan aksi admin
    conn = psycopg2.connect(**PG_CONFIG, dbname="postgres")
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    try:
        cur.execute(sql)
    finally:
        cur.close()
        conn.close()

def kill_pg_connections(dbname):
    """Memutus semua koneksi aktif ke database agar bisa di-drop"""
    sql = f"""
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '{dbname}' AND pid <> pg_backend_pid();
    """
    try:
        run_pg_admin_query(sql)
    except:
        pass

def run_pg_query_on_db(dbname, sql):
    """Menjalankan query (DDL/DML) langsung di dalam database tertentu (bukan db admin 'postgres')"""
    conn = psycopg2.connect(**PG_CONFIG, dbname=dbname)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    try:
        cur.execute(sql)
    finally:
        cur.close()
        conn.close()

# --- LOGIKA CORE ---

def create_minio_bucket(BUCKET_NAME):
    print(f"[*] Checking MinIO bucket: {BUCKET_NAME}...")
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        print(f"✅ Bucket '{BUCKET_NAME}' sudah ada.")
    except ClientError as e:
        if e.response['Error']['Code'] in ['404', '403']:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
            print(f"✅ Bucket '{BUCKET_NAME}' berhasil dibuat.")
        else:
            print(f"❌ Error MinIO: {e}")

def create_db(dbname):
    print(f"[*] Creating Postgres database: {dbname}...")
    try:
        run_pg_admin_query(f"CREATE DATABASE {dbname};")
        print(f"✅ Database '{dbname}' berhasil dibuat.")
    except Exception as e:
        if "already exists" in str(e).lower():
            print(f"✅ Database '{dbname}' sudah tersedia.")
        else:
            print(f"❌ Gagal membuat {dbname}: {e}")

def create_metadata_schema(dbname=METADATA_DB_NAME):
    """
    Membuat schema tabel metadata file (file_metadata) sebagai tabel DuckLake.

    PENTING — perubahan arsitektur:
    Tabel ini TIDAK disimpan sebagai heap table biasa di Postgres. Postgres
    ('unstructure_metadata') di sini hanya berperan sebagai CATALOG DuckLake
    (menyimpan metadata-tentang-metadata: nama tabel, kolom, daftar file
    Parquet, statistik). Data fisik barisnya ditulis sebagai file .parquet
    ke MinIO, di bucket 'metadata' (lihat METADATA_BUCKET_NAME / minio_location).

    Jadi alurnya: Postgres = katalog (ringan), MinIO = penyimpanan data aktual
    (Parquet, kolumnar, lebih efisien untuk query analitik & penyimpanan jangka
    panjang dibanding row-store Postgres).

    Catatan: DuckLake tidak mendukung PRIMARY KEY / UNIQUE constraint asli
    seperti Postgres. Uniqueness pada kolom `id` harus dijaga di level aplikasi
    (main.py men-generate UUID baru tiap upload, jadi collision praktis nihil).
    """
    print(f"[*] Membuat schema 'file_metadata' (tabel DuckLake) via catalog '{dbname}'...")
    con = None
    try:
        con = connect_ducklake_metadata_catalog()

        con.execute("""
            CREATE TABLE IF NOT EXISTS metadata_catalog.file_metadata (
                id              UUID,                                -- artifact_id, dibuat saat upload
                file_name       TEXT,                                -- nama file asli
                file_extension  TEXT,                                -- ekstensi (jpg, pdf, csv, dll)
                file_size       BIGINT,                               -- ukuran file dalam bytes
                content_type    TEXT,                                -- MIME type dari upload

                title           TEXT,                                -- judul file (diisi user)
                description     TEXT,                                -- deskripsi (opsional)
                source          TEXT,                                -- sumber / kategori (diisi user)
                tags            JSON,                                 -- tags, disimpan sbg JSON object
                uploaded_by     TEXT,                                 -- nama / email uploader (opsional)

                bucket          TEXT,                                 -- nama bucket MinIO data utama (lake)
                object_key      TEXT,                                 -- path object di dalam bucket
                minio_url       TEXT,                                 -- URL lengkap ke object di MinIO

                upload_status   TEXT,                                 -- completed / failed / pending
                ingested_at     TIMESTAMPTZ                           -- waktu metadata dicatat
            );
        """)

        print(f"✅ Tabel DuckLake 'file_metadata' siap. Katalog di Postgres '{dbname}', data Parquet di '{minio_location}'.")
    except Exception as e:
        print(f"❌ Gagal membuat schema DuckLake di '{dbname}': {e}")
    finally:
        if con is not None:
            con.close()


def connect_ducklake_metadata_catalog():
    """
    Membuka koneksi DuckDB baru, load extension yang diperlukan, lalu ATTACH
    catalog DuckLake 'metadata_catalog' (Postgres katalog + MinIO bucket 'metadata').
    Dipakai bersama oleh create_metadata_schema, compaction, dan main.py.

    Catatan: tiap pemanggil WAJIB con.close() setelah selesai (gunakan try/finally).
    """
    con = duckdb.connect()
    con.execute("INSTALL ducklake; LOAD ducklake;")
    con.execute("INSTALL postgres; LOAD postgres;")
    con.execute("INSTALL httpfs; LOAD httpfs;")

    con.execute(f"""
        CREATE PERSISTENT SECRET IF NOT EXISTS minio_config (
            TYPE S3, KEY_ID 'minioadmin', SECRET 'miniopassword',
            ENDPOINT 'localhost:9000', URL_STYLE 'path', USE_SSL false
        );
    """)

    con.execute(f"ATTACH 'ducklake:{metadata_of_metadata}' AS metadata_catalog (DATA_PATH '{minio_location}');")
    return con


def compact_metadata_table():
    """
    Memadatkan file Parquet kecil hasil INSERT satu-per-satu (tiap upload via
    main.py menulis 1 file Parquet baru) menjadi file yang lebih besar & sedikit.

    Jalankan ini secara berkala (cron / manual) — terutama setelah banyak
    upload — supaya jumlah file kecil di MinIO tidak menumpuk dan performa
    query tetap baik. Ini trade-off yang disengaja dari pendekatan
    "insert langsung per upload" yang dipakai di main.py.
    """
    print("[*] Menjalankan compaction pada tabel DuckLake 'file_metadata'...")
    con = None
    try:
        con = connect_ducklake_metadata_catalog()
        con.execute("CALL ducklake_merge_adjacent_files('metadata_catalog');")
        # Hapus file fisik lama yang sudah tidak dipakai lagi (expired snapshot)
        con.execute("CALL ducklake_expire_snapshots('metadata_catalog', older_than => now());")
        con.execute("CALL ducklake_cleanup_old_files('metadata_catalog', cleanup_all => true);")
        print("✅ Compaction selesai. File Parquet kecil sudah dipadatkan.")
    except Exception as e:
        print(f"❌ Gagal melakukan compaction: {e}")
    finally:
        if con is not None:
            con.close()



def rebuild_db(dbname):
    print(f"[*] Rebuilding database: {dbname}...")
    try:
        kill_pg_connections(dbname)
        run_pg_admin_query(f"DROP DATABASE IF EXISTS {dbname};")
        run_pg_admin_query(f"CREATE DATABASE {dbname};")
        
        # KONEKSI LANGSUNG KE DB BARU UNTUK MEMBERSIHKAN SCHEMA
        conn = psycopg2.connect(**PG_CONFIG, dbname=dbname)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        # Menghapus skema public dan membuatnya kembali menjamin 0 constraint.
        cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
        cur.execute("CREATE SCHEMA public;")
        cur.execute("GRANT ALL ON SCHEMA public TO public;")
        cur.close()
        conn.close()
        
        print(f"✅ Database '{dbname}' suci dan bersih dari constraint.")
    except Exception as e:
        print(f"❌ Gagal rebuild {dbname}: {e}")

def datalakehouse_initial_setup():
    """Menggabungkan semua komponen ke dalam DuckDB"""
    print("\n--- Starting Full Initial Setup ---")
    create_minio_bucket(NAME_BUCKET)
    create_minio_bucket(METADATA_BUCKET_NAME)
    
    create_db(DUCKLAKE_DB_NAME)
    create_db(SQLMESH_DB_NAME)
    
    create_db(METADATA_DB_NAME)

    try:
        con = duckdb.connect()
        print("[*] Installing & Loading Extensions...")
        con.execute("INSTALL ducklake; LOAD ducklake;")
        con.execute("INSTALL postgres; LOAD postgres;")
        con.execute("INSTALL httpfs; LOAD httpfs;")
        
        print("[*] Configuring S3 Secrets...")
        con.execute(f"""
            CREATE PERSISTENT SECRET IF NOT EXISTS minio_config (
                TYPE S3, KEY_ID 'minioadmin', SECRET 'miniopassword',
                ENDPOINT 'localhost:9000', URL_STYLE 'path', USE_SSL false
            );
        """)
        
        print(f"[*] Attaching DuckLake to Postgres...")
        # Syntax ATTACH DuckLake harus presisi
        con.execute(f"ATTACH 'ducklake:{metadata_conn}' AS lakehouse (DATA_PATH '{data_lake_path}');")
        con.execute(f"ATTACH 'ducklake:{metadata_of_metadata}' AS metadata_catalog (DATA_PATH '{minio_location}');")
        
        print("✅ Datalakehouse initial setup completed successfully!")
        con.close()

        # Schema 'file_metadata' dibuat di catalog metadata_catalog yang baru di-attach
        create_metadata_schema(METADATA_DB_NAME)

    except Exception as e:
        print(f"❌ Error during DuckDB Attach: {e}")
        if "constraints are not supported" in str(e):
            print("\n💡 TIP: Masalah Constraint DuckLake terdeteksi. Silakan pilih opsi 3 untuk Rebuild Metadata DB.")

# --- MAIN MENU ---

if __name__ == "__main__":
    while True:
        print("\n" + "="*45)
        print("      LMS DATA LAKEHOUSE MANAGER (v2.0) ")
        print("="*45)
        print("1. Create MinIO Buckets (lake + metadata)")
        print("2. Create DuckLake Metadata Database (Postgres)")
        print("3. REBUILD DuckLake Metadata Database (Fix Constraints)")
        print("4. Create SQLMesh State Database (Postgres)")
        print("5. REBUILD SQLMesh State Database")
        print("6. Compact file_metadata (gabungkan file Parquet kecil)")
        print("7. Create unstructure_metadata Catalog + Schema (file_metadata, Parquet di MinIO)")
        print("8. REBUILD unstructure_metadata Catalog + Schema")
        print("9. RUN FULL INITIAL SETUP")
        print("-" * 45)
        print("Type 'exit' to quit program")
        
        user_input = input(">> Select choice: ").strip().lower()

        if user_input == 'exit':
            print("👋 Exiting program...")
            break
        
        elif user_input == '1':
            create_minio_bucket(NAME_BUCKET)
            create_minio_bucket(METADATA_BUCKET_NAME)
        elif user_input == '2':
            create_db(DUCKLAKE_DB_NAME)
        elif user_input == '3':
            rebuild_db(DUCKLAKE_DB_NAME)
        elif user_input == '4':
            create_db(SQLMESH_DB_NAME)
        elif user_input == '5':
            rebuild_db(SQLMESH_DB_NAME)
        elif user_input == '6':
            compact_metadata_table()
        elif user_input == '7':
            create_minio_bucket(METADATA_BUCKET_NAME)
            create_db(METADATA_DB_NAME)
            create_metadata_schema(METADATA_DB_NAME)
        elif user_input == '8':
            create_minio_bucket(METADATA_BUCKET_NAME)
            rebuild_db(METADATA_DB_NAME)
            create_metadata_schema(METADATA_DB_NAME)
        elif user_input == '9':
            datalakehouse_initial_setup()
        else:
            print("⚠️ Invalid option. Please try again.")

        time.sleep(1)
        input("\n[Press Enter to return to menu]")