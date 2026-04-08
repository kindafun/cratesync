# CrateSync

CrateSync is a local-first macOS app for migrating Discogs collection items between accounts. It combines a FastAPI backend with a React UI so you can sync both accounts locally, filter and curate the source snapshot, preview the result, and run copy or move jobs with an audit trail.

## What It Does

- Connect one source account and one destination account with Discogs OAuth.
- Sync each account into a local SQLite-backed snapshot.
- Narrow the source snapshot with filters and saved views.
- Support manual selection, row click selection, and shift-click range selection.
- Preview duplicates, blocking conflicts, and metadata constraints before launch.
- Run copy-only or two-phase move jobs and export job reports locally.

## Quickstart

Requirements:

- macOS
- Python 3.9+
- Node.js 18+
- Discogs API consumer key and consumer secret

Install:

```bash
cp .env.example .env
pip install -e "backend[dev]"
npm install --prefix frontend
```

Run the two dev servers in separate terminals:

```bash
uvicorn app.main:app --app-dir backend --reload
```

```bash
npm run dev --prefix frontend
```

The backend runs on `http://127.0.0.1:8421` and the frontend runs on `http://127.0.0.1:5173`.

To run the built frontend directly from FastAPI instead of Vite:

```bash
npm run build --prefix frontend
DISCOGS_MIGRATION_SERVE_FRONTEND=1 uvicorn app.main:app --app-dir backend
```

In built-frontend mode, open `http://127.0.0.1:8421`.

For the current macOS beta packaging flow:

```bash
pip install -e "backend[package]"
./scripts/package_macos.sh
```

## Documentation Map

- [docs/README.md](docs/README.md) for the documentation index
- [docs/dev-setup.md](docs/dev-setup.md) for environment, install, run, test, and local-data details
- [docs/architecture.md](docs/architecture.md) for backend/frontend boundaries and storage/auth architecture
- [docs/migration-workflow.md](docs/migration-workflow.md) for copy/move workflow semantics
- [docs/design-system.md](docs/design-system.md) for UI tokens and implementation rules
- [docs/package-macos.md](docs/package-macos.md) for packaging notes
- [CLAUDE.md](CLAUDE.md) for coding-agent rules
- [.impeccable.md](.impeccable.md) for persistent design direction

## Workspace Layout

- `backend/`: FastAPI API, Discogs integration, job orchestration, SQLite persistence
- `frontend/`: Vite + React + TypeScript UI
- `docs/`: current repo documentation
- `discogs_migration.py`, `discogs_deletion.py`: legacy reference scripts

## Notes

- This is a local, single-user tool intended for one source and one destination account at a time.
- OAuth tokens are stored in the macOS Keychain. App state, snapshots, exports, and the SQLite database live under `app_data/` by default in source checkouts and under `~/Library/Application Support/CrateSync/` in frozen bundles.
- The legacy Python scripts remain in the repo as references; the FastAPI + React app is the active product surface.
