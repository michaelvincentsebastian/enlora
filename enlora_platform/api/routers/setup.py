from __future__ import annotations

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from enlora_platform.core import lakehouse
from enlora_platform.core.config import config

router = APIRouter(prefix="/setup", tags=["Setup"])
_executor = ThreadPoolExecutor(max_workers=2)


def _sse_event(data: str, event: str = "message") -> str:
    return f"event: {event}\ndata: {json.dumps({'message': data})}\n\n"


async def _run_with_sse(fn, *args) -> AsyncGenerator[str, None]:
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[str | None] = asyncio.Queue()

    def callback(msg: str):
        loop.call_soon_threadsafe(queue.put_nowait, msg)

    async def producer():
        await loop.run_in_executor(_executor, fn, *args, callback)
        queue.put_nowait(None)

    task = asyncio.create_task(producer())

    try:
        while True:
            msg = await queue.get()
            if msg is None:
                yield _sse_event("__DONE__", event="done")
                break
            yield _sse_event(msg)
    finally:
        await task


@router.post("/full")
async def run_full_setup():
    return StreamingResponse(
        _run_with_sse(lakehouse.full_initial_setup),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/buckets")
async def create_buckets():
    results = [
        lakehouse.create_minio_bucket(config.buckets.lake),
        lakehouse.create_minio_bucket(config.buckets.metadata),
    ]
    return {"results": results}


@router.post("/databases")
async def create_databases():
    results = [
        lakehouse.create_db(config.databases.ducklake),
        lakehouse.create_db(config.databases.sqlmesh),
        lakehouse.create_db(config.databases.unstructure_metadata),
    ]
    return {"results": results}


@router.post("/schema")
async def create_schema():
    return lakehouse.create_metadata_schema()


@router.post("/compact")
async def compact():
    return StreamingResponse(
        _run_with_sse(lakehouse.compact_metadata_table),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/rebuild/{component}")
async def rebuild_component(component: str):
    db_map = {
        "metadata_db": config.databases.ducklake,
        "sqlmesh_db": config.databases.sqlmesh,
        "unstructure_metadata_db": config.databases.unstructure_metadata,
    }
    if component not in db_map:
        return {"error": f"Unknown component '{component}'. Valid: {list(db_map.keys())}"}

    return StreamingResponse(
        _run_with_sse(lakehouse.rebuild_db, db_map[component]),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
