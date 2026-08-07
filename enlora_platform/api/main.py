"""
enlora_platform/api/main.py
---------------------------
Enlora Platform API — FastAPI entrypoint on port 8001.

Run:
    uvicorn enlora_platform.api.main:app --reload --port 8001
Or via docker-compose (platform-api service).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from enlora_platform.api.routers import setup, status, storage

app = FastAPI(
    title="Enlora Platform API",
    description=(
        "Control plane and storage API for the Enlora data lakehouse platform. "
        "Handles provisioning, health checks, setup wizard, file uploads, and artifact browsing."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(setup.router)
app.include_router(status.router)
app.include_router(storage.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"service": "enlora-platform-api", "status": "ok", "version": "0.1.0"}


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Enlora Platform API",
        "docs": "/api/docs",
        "status": "/status",
        "setup": "/setup",
        "storage": ["/upload", "/artifacts"],
    }
