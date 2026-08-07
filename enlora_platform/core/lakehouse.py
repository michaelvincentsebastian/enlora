"""
enlora_platform/core/lakehouse.py
---------------------------------
Core lakehouse functions for setup, compaction, schema, status, and artifact operations.
Uses config from enlora_platform.core.config.
"""
from __future__ import annotations

import uuid
import datetime
import duckdb
import psycopg2
import boto3
from botocore.exceptions import ClientError
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from typing import Callable, Optional, List, Dict, Any

from enlora_platform.core.config import config

ProgressCallback = Optional[Callable[[str], None]]


def _log(msg: str, cb: ProgressCallback = None) -> None:
    print(msg)
    if cb:
        cb(msg)


# ─── S3 / MinIO ────────────────────────────────────────────────────────────────

def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=config.minio.endpoint_url,
        aws_access_key_id=config.minio.access_key,
        aws_secret_access_key=config.minio.secret_key,
        use_ssl=config.minio.use_ssl,
        verify=False,
    )


def create_minio_bucket(bucket_name: str, cb: ProgressCallback = None) -> dict:
    _log(f"[*] Checking MinIO bucket: {bucket_name}...", cb)
    try:
        _s3_client().head_bucket(Bucket=bucket_name)
        _log(f"✅ Bucket '{bucket_name}' already exists.", cb)
        return {"bucket": bucket_name, "status": "exists"}
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ["404", "403"]:
            _s3_client().create_bucket(Bucket=bucket_name)
            _log(f"✅ Bucket '{bucket_name}' created.", cb)
            return {"bucket": bucket_name, "status": "created"}
        _log(f"❌ MinIO error: {e}", cb)
        return {"bucket": bucket_name, "status": "error", "detail": str(e)}


# ─── PostgreSQL helpers ─────────────────────────────────────────────────────────

def _pg_admin_conn():
    conn = psycopg2.connect(
        host=config.pg.host,
        port=config.pg.port,
        user=config.pg.user,
        password=config.pg.password,
        dbname="postgres",
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn


def _run_pg_admin(sql: str) -> None:
    conn = _pg_admin_conn()
    cur = conn.cursor()
    try:
        cur.execute(sql)
    finally:
        cur.close()
        conn.close()


def _kill_pg_connections(dbname: str) -> None:
    sql = f"""
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '{dbname}' AND pid <> pg_backend_pid();
    """
    try:
        _run_pg_admin(sql)
    except Exception:
        pass


def create_db(dbname: str, cb: ProgressCallback = None) -> dict:
    _log(f"[*] Creating Postgres database: {dbname}...", cb)
    try:
        _run_pg_admin(f"CREATE DATABASE {dbname};")
        _log(f"✅ Database '{dbname}' created.", cb)
        return {"database": dbname, "status": "created"}
    except Exception as e:
        if "already exists" in str(e).lower():
            _log(f"✅ Database '{dbname}' already exists.", cb)
            return {"database": dbname, "status": "exists"}
        _log(f"❌ Failed to create {dbname}: {e}", cb)
        return {"database": dbname, "status": "error", "detail": str(e)}


def rebuild_db(dbname: str, cb: ProgressCallback = None) -> dict:
    _log(f"[*] Rebuilding database: {dbname}...", cb)
    try:
        _kill_pg_connections(dbname)
        _run_pg_admin(f"DROP DATABASE IF EXISTS {dbname};")
        _run_pg_admin(f"CREATE DATABASE {dbname};")

        conn = psycopg2.connect(
            host=config.pg.host, port=config.pg.port,
            user=config.pg.user, password=config.pg.password,
            dbname=dbname,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute("DROP SCHEMA IF EXISTS public CASCADE;")
        cur.execute("CREATE SCHEMA public;")
        cur.execute("GRANT ALL ON SCHEMA public TO public;")
        cur.close()
        conn.close()

        _log(f"✅ Database '{dbname}' rebuilt clean.", cb)
        return {"database": dbname, "status": "rebuilt"}
    except Exception as e:
        _log(f"❌ Failed to rebuild {dbname}: {e}", cb)
        return {"database": dbname, "status": "error", "detail": str(e)}


# ─── DuckLake helpers ───────────────────────────────────────────────────────────

def _ducklake_catalog_conn() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("INSTALL ducklake; LOAD ducklake;")
    con.execute("INSTALL postgres; LOAD postgres;")
    con.execute("INSTALL httpfs; LOAD httpfs;")

    con.execute(f"""
        CREATE PERSISTENT SECRET IF NOT EXISTS minio_config (
            TYPE S3,
            KEY_ID '{config.minio.access_key}',
            SECRET '{config.minio.secret_key}',
            ENDPOINT '{config.minio.endpoint}',
            URL_STYLE 'path',
            USE_SSL {str(config.minio.use_ssl).lower()}
        );
    """)

    metadata_dsn = config.pg.dsn(config.databases.unstructure_metadata)
    minio_location = f"s3://{config.buckets.metadata}/"
    con.execute(f"ATTACH 'ducklake:{metadata_dsn}' AS metadata_catalog (DATA_PATH '{minio_location}');")
    return con


def create_metadata_schema(cb: ProgressCallback = None) -> dict:
    _log("[*] Creating DuckLake schema 'file_metadata'...", cb)
    con = None
    try:
        con = _ducklake_catalog_conn()
        con.execute("""
            CREATE TABLE IF NOT EXISTS metadata_catalog.file_metadata (
                id              UUID,
                file_name       TEXT,
                file_extension  TEXT,
                file_size       BIGINT,
                content_type    TEXT,
                title           TEXT,
                description     TEXT,
                source          TEXT,
                tags            JSON,
                uploaded_by     TEXT,
                bucket          TEXT,
                object_key      TEXT,
                minio_url       TEXT,
                upload_status   TEXT,
                ingested_at     TIMESTAMPTZ
            );
        """)
        _log("✅ DuckLake table 'file_metadata' ready.", cb)
        return {"table": "file_metadata", "status": "ready"}
    except Exception as e:
        _log(f"❌ Failed to create DuckLake schema: {e}", cb)
        return {"table": "file_metadata", "status": "error", "detail": str(e)}
    finally:
        if con is not None:
            con.close()


def compact_metadata_table(cb: ProgressCallback = None) -> dict:
    _log("[*] Running compaction on DuckLake 'file_metadata'...", cb)
    con = None
    try:
        con = _ducklake_catalog_conn()
        con.execute("CALL ducklake_merge_adjacent_files('metadata_catalog');")
        con.execute("CALL ducklake_expire_snapshots('metadata_catalog', older_than => now());")
        con.execute("CALL ducklake_cleanup_old_files('metadata_catalog', cleanup_all => true);")
        _log("✅ Compaction complete.", cb)
        return {"status": "compacted"}
    except Exception as e:
        _log(f"❌ Compaction failed: {e}", cb)
        return {"status": "error", "detail": str(e)}
    finally:
        if con is not None:
            con.close()


# ─── Full initial setup ─────────────────────────────────────────────────────────

def full_initial_setup(cb: ProgressCallback = None) -> dict:
    results = []
    _log("\n--- Enlora: Full Initial Setup ---", cb)

    results.append(create_minio_bucket(config.buckets.lake, cb))
    results.append(create_minio_bucket(config.buckets.metadata, cb))

    results.append(create_db(config.databases.ducklake, cb))
    results.append(create_db(config.databases.sqlmesh, cb))
    results.append(create_db(config.databases.unstructure_metadata, cb))

    _log("[*] Attaching DuckLake catalogs and installing extensions...", cb)
    try:
        con = duckdb.connect()
        con.execute("INSTALL ducklake; LOAD ducklake;")
        con.execute("INSTALL postgres; LOAD postgres;")
        con.execute("INSTALL httpfs; LOAD httpfs;")

        con.execute(f"""
            CREATE PERSISTENT SECRET IF NOT EXISTS minio_config (
                TYPE S3,
                KEY_ID '{config.minio.access_key}',
                SECRET '{config.minio.secret_key}',
                ENDPOINT '{config.minio.endpoint}',
                URL_STYLE 'path',
                USE_SSL {str(config.minio.use_ssl).lower()}
            );
        """)

        ducklake_dsn = config.pg.dsn(config.databases.ducklake)
        unstructure_dsn = config.pg.dsn(config.databases.unstructure_metadata)
        lake_path = f"s3://{config.buckets.lake}/"
        meta_path = f"s3://{config.buckets.metadata}/"

        con.execute(f"ATTACH 'ducklake:{ducklake_dsn}' AS lakehouse (DATA_PATH '{lake_path}');")
        con.execute(f"ATTACH 'ducklake:{unstructure_dsn}' AS metadata_catalog (DATA_PATH '{meta_path}');")
        con.close()
        _log("✅ DuckLake catalogs attached.", cb)
    except Exception as e:
        _log(f"❌ DuckLake attach error: {e}", cb)
        results.append({"ducklake_attach": "error", "detail": str(e)})
        return {"overall": "partial", "steps": results}

    results.append(create_metadata_schema(cb))

    _log("\n✅ Enlora initial setup complete!", cb)
    return {"overall": "success", "steps": results}


# ─── Status checks ──────────────────────────────────────────────────────────────

def check_postgres_status() -> dict:
    try:
        conn = psycopg2.connect(
            host=config.pg.host, port=config.pg.port,
            user=config.pg.user, password=config.pg.password,
            dbname="postgres", connect_timeout=3,
        )
        conn.close()
        return {"service": "postgres", "status": "online", "host": config.pg.host, "port": config.pg.port}
    except Exception as e:
        return {"service": "postgres", "status": "offline", "detail": str(e)}


def check_minio_status() -> dict:
    try:
        client = _s3_client()
        client.list_buckets()
        return {"service": "minio", "status": "online", "endpoint": config.minio.endpoint_url}
    except Exception as e:
        return {"service": "minio", "status": "offline", "detail": str(e)}


def get_full_status() -> dict:
    pg = check_postgres_status()
    minio = check_minio_status()

    databases = {}
    if pg["status"] == "online":
        try:
            conn = psycopg2.connect(
                host=config.pg.host, port=config.pg.port,
                user=config.pg.user, password=config.pg.password,
                dbname="postgres",
            )
            cur = conn.cursor()
            for dbname in [config.databases.ducklake, config.databases.sqlmesh, config.databases.unstructure_metadata]:
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
                databases[dbname] = "exists" if cur.fetchone() else "missing"
            cur.close()
            conn.close()
        except Exception:
            pass

    buckets = {}
    if minio["status"] == "online":
        try:
            client = _s3_client()
            existing = {b["Name"] for b in client.list_buckets()["Buckets"]}
            for bucket in [config.buckets.lake, config.buckets.metadata]:
                buckets[bucket] = "exists" if bucket in existing else "missing"
        except Exception:
            pass

    return {
        "postgres": pg,
        "minio": minio,
        "databases": databases,
        "buckets": buckets,
        "provisioned": (
            pg["status"] == "online"
            and minio["status"] == "online"
            and all(v == "exists" for v in databases.values())
            and all(v == "exists" for v in buckets.values())
        ),
    }


# ─── Storage Operations (Upload & Artifacts) ───────────────────────────────────

def upload_file_to_lakehouse(
    file_bytes: bytes,
    filename: str,
    content_type: str,
    title: str = "",
    description: str = "",
    source: str = "",
    tags: str = "{}",
    uploaded_by: str = "",
) -> dict:
    artifact_id = str(uuid.uuid4())
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    object_key = f"uploads/{artifact_id}/{filename}"
    bucket = config.buckets.lake

    # 1. Upload file bytes to MinIO lake bucket
    s3 = _s3_client()
    s3.put_object(
        Bucket=bucket,
        Key=object_key,
        Body=file_bytes,
        ContentType=content_type or "application/octet-stream",
    )
    minio_url = f"{config.minio.endpoint_url}/{bucket}/{object_key}"

    # 2. Insert metadata record into DuckLake file_metadata table
    con = None
    try:
        con = _ducklake_catalog_conn()
        now_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        con.execute(
            """
            INSERT INTO metadata_catalog.file_metadata (
                id, file_name, file_extension, file_size, content_type,
                title, description, source, tags, uploaded_by,
                bucket, object_key, minio_url, upload_status, ingested_at
            ) VALUES (
                ?::UUID, ?, ?, ?, ?,
                ?, ?, ?, ?::JSON, ?,
                ?, ?, ?, ?, ?::TIMESTAMPTZ
            );
            """,
            [
                artifact_id, filename, ext, len(file_bytes), content_type,
                title or filename, description, source, tags or "{}", uploaded_by,
                bucket, object_key, minio_url, "completed", now_ts
            ]
        )
    finally:
        if con is not None:
            con.close()

    return {
        "artifact_id": artifact_id,
        "file_name": filename,
        "file_size": len(file_bytes),
        "bucket": bucket,
        "object_key": object_key,
        "status": "completed",
    }


def list_artifacts() -> List[Dict[str, Any]]:
    con = None
    try:
        con = _ducklake_catalog_conn()
        res = con.execute("""
            SELECT id::TEXT, file_name, file_extension, file_size, content_type,
                   title, description, source, tags::TEXT, uploaded_by,
                   bucket, object_key, minio_url, upload_status, ingested_at::TEXT
            FROM metadata_catalog.file_metadata
            ORDER BY ingested_at DESC;
        """).fetchall()
        cols = [
            "id", "file_name", "file_extension", "file_size", "content_type",
            "title", "description", "source", "tags", "uploaded_by",
            "bucket", "object_key", "minio_url", "upload_status", "ingested_at"
        ]
        return [dict(zip(cols, row)) for row in res]
    except Exception as e:
        print(f"Error fetching artifacts: {e}")
        return []
    finally:
        if con is not None:
            con.close()
