# Enlora — Data Lifecycle Platform

> **The easiest open-source end-to-end modern data platform.**
> Manage your full data lifecycle — from ingestion to analytics — in one unified interface.

---

## What is Enlora?

Enlora is a self-hosted data platform that abstracts 9 capabilities of the modern data stack behind a clean, unified UI. Instead of wiring together Airflow, dbt, Metabase, and five other tools yourself, Enlora does it for you — while keeping every technology component swappable.

```
Connections → Storage → Pipeline → Modeling → Analytics → Catalog → Workspace → Infrastructure → AI
```

**Current status:** Phase 1 — Storage capability is live. All other capabilities are planned (Phase 2–3).

---

## Quick Start

### Prerequisites
- Docker Desktop running
- Python 3.11+ with a virtual environment
- Node.js 18+

### 1. Start infrastructure (PostgreSQL + MinIO)
```bash
docker compose up -d postgres minio
```

### 2. Install Python dependencies
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows (or source .venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
```

### 3. Copy and configure environment
```bash
cp .env.example .env
# Edit .env with your settings (defaults work for local dev)
```

### 4. Start the Platform API (Backend)
```bash
uvicorn enlora_platform.api.main:app --reload --port 8001
```

### 5. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 6. Run the Setup Wizard
Open **http://localhost:5173** → click **Setup Wizard** → follow the steps.

This provisions MinIO buckets (`lake`, `metadata`), Postgres databases, and the DuckLake schema — replacing the old `lakehouse-setup.py` interactive CLI.

---

## Architecture

```
frontend (React/Vite :5173)
    ↓ proxy
enlora_platform/api/ (FastAPI :8001)   ← Unified API: setup, status, upload, artifacts
    ↓
enlora_platform/core/lakehouse.py     ← Core engine operations & DuckLake attach
    ↓
┌─────────────────────────────────────────────┐
│ PostgreSQL 16 (:5432)  MinIO (:9000)        │
│   DuckLake catalogs    lake + metadata      │
│   sqlmesh_state_db     buckets              │
│   unstructure_metadata                      │
└─────────────────────────────────────────────┘
```

### Storage Pattern (how DuckLake works here)
- **PostgreSQL** = DuckLake catalog (lightweight index of table/column defs & Parquet manifests)
- **MinIO** = actual data storage (Parquet files, raw uploaded files)
- **DuckDB** = embedded query engine (opened per-request)

> ⚠️ DuckLake does not support `PRIMARY KEY` / `UNIQUE` constraints. Uniqueness of the `id` column is enforced at the application layer via UUID generation.

---

## Repository Structure

```
enlora/
├── .env                      # Local environment config (git-ignored)
├── .env.example              # Config template
├── docker-compose.yml        # postgres + minio + platform-api
├── Dockerfile                # Platform API container
├── requirements.txt          # Python deps
│
├── enlora_platform/          # Python platform package
│   ├── core/
│   │   ├── config.py         # Typed config from .env
│   │   └── lakehouse.py      # Refactored lakehouse operations & storage logic
│   └── api/
│       ├── main.py           # FastAPI entrypoint (port 8001)
│       └── routers/
│           ├── setup.py      # /setup/* endpoints (wizard operations)
│           ├── status.py     # /status/* health checks
│           └── storage.py    # /upload and /artifacts endpoints
│
└── frontend/                 # Vite + React SPA (port 5173)
    └── src/
        ├── pages/            # Dashboard, Setup, Storage, + 8 capability stubs
        └── components/       # Sidebar, TopBar, StatusBadge, CapabilityStub
```

---

## Capabilities Roadmap

| # | Capability | Phase | Status |
|---|---|---|---|
| 1 | Connections | 2 | 🗺 Planned |
| 2 | Storage | 1 | ✅ **Live** |
| 3 | Pipeline | 2 | 🗺 Planned |
| 4 | Data Modeling | 2 | 🗺 Planned |
| 5 | Analytics | 3 | 🗺 Planned |
| 6 | Catalog | 2 | 🗺 Planned |
| 7 | Workspace | 2 | 🗺 Planned |
| 8 | Infrastructure | 3 | 🗺 Planned |
| 9 | AI Assistant | 3 | 🗺 Planned |

---

## Platform API Endpoints

Base URL: `http://localhost:8001`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Platform API health |
| `GET` | `/status` | Full service status (Postgres, MinIO, databases, buckets) |
| `POST` | `/setup/full` | Run full idempotent setup (SSE stream) |
| `POST` | `/setup/buckets` | Create MinIO buckets |
| `POST` | `/setup/databases` | Create Postgres databases |
| `POST` | `/setup/schema` | Create DuckLake file_metadata table |
| `POST` | `/setup/compact` | Compact Parquet files (SSE stream) |
| `POST` | `/setup/rebuild/{component}` | Rebuild specific component |
| `POST` | `/upload` | Multipart file upload to MinIO lake & DuckLake registration |
| `GET` | `/artifacts` | List all registered artifacts from DuckLake catalog |

Interactive docs: `http://localhost:8001/api/docs`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Catalog | PostgreSQL 16 |
| Object Storage | MinIO (S3-compatible) |
| Query Engine | DuckDB 1.5.4 + ducklake, httpfs, postgres extensions |
| Transform | SQLMesh 0.235.4 (configured, models coming in Phase 2) |
| Platform API | FastAPI + Uvicorn (port 8001) |
| Frontend | React 18 + Vite (port 5173) |
| Styling | Vanilla CSS (dark mode, glassmorphism) |

---

## License

MIT — see [LICENSE](LICENSE).
