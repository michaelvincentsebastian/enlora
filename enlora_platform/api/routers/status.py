from fastapi import APIRouter
from enlora_platform.core.lakehouse import get_full_status, check_postgres_status, check_minio_status

router = APIRouter(prefix="/status", tags=["Status"])


@router.get("")
async def full_status():
    """Returns aggregated health status for all Enlora services."""
    return get_full_status()


@router.get("/postgres")
async def postgres_status():
    return check_postgres_status()


@router.get("/minio")
async def minio_status():
    return check_minio_status()
