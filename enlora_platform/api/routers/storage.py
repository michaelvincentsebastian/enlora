from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from enlora_platform.core import lakehouse

router = APIRouter(tags=["Storage"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(""),
    description: Optional[str] = Form(""),
    source: Optional[str] = Form(""),
    tags: Optional[str] = Form("{}"),
    uploaded_by: Optional[str] = Form(""),
):
    """
    Accepts multipart file upload, streams bytes to MinIO lake bucket,
    and inserts metadata record into DuckLake file_metadata table.
    """
    contents = await file.read()
    res = lakehouse.upload_file_to_lakehouse(
        file_bytes=contents,
        filename=file.filename or "unnamed_file",
        content_type=file.content_type or "application/octet-stream",
        title=title or "",
        description=description or "",
        source=source or "",
        tags=tags or "{}",
        uploaded_by=uploaded_by or "",
    )
    return res


@router.get("/artifacts")
async def get_artifacts():
    """
    Queries the DuckLake file_metadata catalog table and returns all registered file artifacts.
    """
    artifacts = lakehouse.list_artifacts()
    return {"artifacts": artifacts}
