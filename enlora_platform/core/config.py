from dataclasses import dataclass, field
from dotenv import load_dotenv
import os

# Load .env from the project root (two levels up from this file)
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(_root, ".env"))


@dataclass
class PgConfig:
    host: str = field(default_factory=lambda: os.getenv("PG_HOST", "localhost"))
    port: str = field(default_factory=lambda: os.getenv("PG_PORT", "5432"))
    user: str = field(default_factory=lambda: os.getenv("PG_USER", "postgres"))
    password: str = field(default_factory=lambda: os.getenv("PG_PASSWORD", "postgres"))

    def dsn(self, dbname: str = "postgres") -> str:
        return f"dbname={dbname} host={self.host} user={self.user} password={self.password} port={self.port}"


@dataclass
class MinioConfig:
    endpoint: str = field(default_factory=lambda: os.getenv("MINIO_ENDPOINT", "localhost:9000"))
    access_key: str = field(default_factory=lambda: os.getenv("MINIO_ACCESS_KEY", "minioadmin"))
    secret_key: str = field(default_factory=lambda: os.getenv("MINIO_SECRET_KEY", "minioadmin"))
    use_ssl: bool = field(default_factory=lambda: os.getenv("MINIO_USE_SSL", "false").lower() == "true")

    @property
    def endpoint_url(self) -> str:
        scheme = "https" if self.use_ssl else "http"
        return f"{scheme}://{self.endpoint}"


@dataclass
class BucketConfig:
    lake: str = field(default_factory=lambda: os.getenv("LAKE_BUCKET", "lake"))
    metadata: str = field(default_factory=lambda: os.getenv("METADATA_BUCKET", "metadata"))


@dataclass
class DatabaseConfig:
    ducklake: str = field(default_factory=lambda: os.getenv("DUCKLAKE_DB", "metadata_db"))
    sqlmesh: str = field(default_factory=lambda: os.getenv("SQLMESH_DB", "sqlmesh_state_db"))
    unstructure_metadata: str = field(default_factory=lambda: os.getenv("UNSTRUCTURE_METADATA_DB", "unstructure_metadata"))


@dataclass
class EnloraConfig:
    pg: PgConfig = field(default_factory=PgConfig)
    minio: MinioConfig = field(default_factory=MinioConfig)
    buckets: BucketConfig = field(default_factory=BucketConfig)
    databases: DatabaseConfig = field(default_factory=DatabaseConfig)


# Singleton instance — import this everywhere
config = EnloraConfig()
