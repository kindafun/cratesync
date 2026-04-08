---
title: dev-setup
type: note
permalink: discogs-migration/dev-setup
---

# Dev Setup

## Prerequisites

- macOS
- Python 3.9+
- Node.js 18+
- A Discogs developer application

Set the Discogs callback URL to `http://127.0.0.1:8421/auth/discogs/callback`.

## Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required variables:

- `DISCOGS_CONSUMER_KEY`
- `DISCOGS_CONSUMER_SECRET`

Optional variables:

- `BACKEND_ORIGIN` default: `http://127.0.0.1:8421`
- `FRONTEND_ORIGIN` default: `http://127.0.0.1:5173` in dev, `BACKEND_ORIGIN` when serving the built frontend from FastAPI
- `DISCOGS_MIGRATION_APP_DIR` default: `app_data/`
- `DISCOGS_MIGRATION_DB_PATH` default: `app_data/discogs_migration.sqlite3`
- `DISCOGS_MIGRATION_EXPORT_DIR` default: `app_data/exports/`
- `DISCOGS_MIGRATION_SERVE_FRONTEND` default: `0` in source checkouts, `1` in frozen bundles
- `DISCOGS_MIGRATION_FRONTEND_DIST_DIR` default: `frontend/dist`
- `DISCOGS_KEYCHAIN_SERVICE` default: `local.discogs-migration.tokens`
- `DISCOGS_REQUEST_DELAY_SECONDS` default: `1.1`
- `SNAPSHOT_STALE_HOURS` default: `4`

## Install

Backend:

```bash
pip install -e "backend[dev]"
```

Frontend:

```bash
npm install --prefix frontend
```

Packaging helper:

```bash
pip install -e "backend[package]"
```

## Run

Backend:

```bash
uvicorn app.main:app --app-dir backend --reload
```

Frontend:

```bash
npm run dev --prefix frontend
```

Run the backend and frontend in separate terminals.

Defaults:

- Backend: `http://127.0.0.1:8421`
- Frontend: `http://127.0.0.1:5173`

On first backend startup, CrateSync creates local storage under `app_data/` and initializes the SQLite database.

## Built Frontend Mode

To serve the production frontend bundle directly from FastAPI without Vite:

```bash
npm run build --prefix frontend
DISCOGS_MIGRATION_SERVE_FRONTEND=1 uvicorn app.main:app --app-dir backend
```

In this mode, open `http://127.0.0.1:8421` and set `FRONTEND_ORIGIN` only if you need the OAuth popup to post back to a different local origin.

## Verification

Backend tests:

```bash
python3 -m pytest backend/app/tests
```

Frontend build:

```bash
npm run build --prefix frontend
```

## Local Data

- SQLite database: `app_data/discogs_migration.sqlite3`
- Exports: `app_data/exports/`
- Snapshots, jobs, and app state: `app_data/`
- OAuth tokens: macOS Keychain under `local.discogs-migration.tokens` by default

Frozen macOS bundles default their writable data directory to `~/Library/Application Support/CrateSync/`.

## Reset

Use the app's `Clear local data` action to remove local snapshots, presets, job history, exports, and connected-account tokens from this machine. The backend also exposes `DELETE /local-data` for the same operation.
