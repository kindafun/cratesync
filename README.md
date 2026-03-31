# CrateSync

Local-first Discogs collection migration app for macOS. It pairs a FastAPI backend with a React UI so you can sync both accounts locally, choose exactly which releases to migrate, preview the result, and run copy or move jobs with an audit trail.

## What The App Does

- connects one source Discogs account and one destination Discogs account through Discogs OAuth
- syncs each account into a local SQLite-backed collection snapshot
- lets you narrow the source snapshot with optional filters and saved views
- supports manual selection, row click selection, and shift-click range selection in the source table
- previews a migration plan against the destination snapshot before any job is launched
- runs copy-only or two-phase move jobs and keeps local job history

## Current Workflow

The UI is organized around three main steps:

1. Build the source view
   Add only the filters you want, save reusable views, and decide whether the plan is a copy or two-phase move.
2. Curate source selection
   Review the synced source snapshot, sort columns, select rows directly from the table, and compare against the destination reference snapshot.
3. Review and launch
   Generate a preview, inspect duplicates and blocking conflicts, resolve required mappings, and launch the migration job.

## Workspace Layout

- `backend/`: FastAPI API, Discogs integration, job orchestration, SQLite persistence
- `frontend/`: Vite + React + TypeScript UI
- `docs/`: implementation notes and packaging guidance
- `discogs_migration.py`, `discogs_deletion.py`: legacy reference scripts

## Requirements

- macOS
- Python 3.9+
- Node.js 18+
- Discogs API consumer key and consumer secret

## Environment

Copy `.env.example` to `.env` and fill in your Discogs credentials:

```bash
cp .env.example .env
```

Supported variables:

- `DISCOGS_CONSUMER_KEY`
- `DISCOGS_CONSUMER_SECRET`
- `BACKEND_ORIGIN` default: `http://127.0.0.1:8421`
- `FRONTEND_ORIGIN` default: `http://127.0.0.1:5173`
- `DISCOGS_MIGRATION_APP_DIR` optional override for local app data
- `DISCOGS_MIGRATION_DB_PATH` optional override for the SQLite database
- `DISCOGS_MIGRATION_EXPORT_DIR` optional override for generated exports
- `DISCOGS_KEYCHAIN_SERVICE` optional override for stored token naming
- `DISCOGS_REQUEST_DELAY_SECONDS` optional Discogs request pacing
- `SNAPSHOT_STALE_HOURS` optional snapshot freshness threshold

OAuth tokens are stored in the macOS keychain. App state, snapshots, the SQLite database, and exports are stored locally under `app_data/` by default.

## Local Development

### Backend

Install backend dependencies:

```bash
pip install -e backend
```

Run the API:

```bash
uvicorn app.main:app --app-dir backend --reload
```

The backend will initialize local storage and create the SQLite database on startup.

### Frontend

Install frontend dependencies:

```bash
npm install --prefix frontend
```

Run the UI:

```bash
npm run dev --prefix frontend
```

By default the frontend expects the backend at `http://127.0.0.1:8421`.

## Verification

Run backend tests:

```bash
python3 -m pytest backend/app/tests
```

Verify the frontend build:

```bash
npm run build --prefix frontend
```

## Local Data

By default the app creates these local artifacts:

- `app_data/discogs_migration.sqlite3`: SQLite database
- `app_data/exports/`: generated exports
- local collection snapshots for both accounts
- migration job history and preview metadata

The UI also includes a `Clear local data` action for wiping local app state.

## Current Limits And Assumptions

- this is a local, single-user app intended for one source and one destination account at a time
- only one active migration job is allowed at once
- planning depends on synced local snapshots; if an account has not been synced, preview and job launch stay blocked
- the destination snapshot is a reference view only; source selection drives what gets migrated

## Notes

- `docs/` contains implementation notes and packaging guidance
- the legacy Python scripts remain in the repo as references, but the FastAPI + React app is the active product surface
