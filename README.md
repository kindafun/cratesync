# Discogs Migration Local App

Local-first Discogs collection migration app for macOS. It provides:

- sequential Discogs OAuth account connections
- local SQLite-backed collection snapshots
- rich migration planning across folders, dates, filters, and manual item sets
- resumable copy and move jobs with audit trails
- a localhost React UI backed by FastAPI

## Workspace Layout

- `backend/`: FastAPI API, job runner, SQLite persistence, Discogs integration
- `frontend/`: Vite React client for planning and monitoring migrations
- `docs/`: implementation notes and packaging guidance
- `discogs_migration.py`, `discogs_deletion.py`: legacy reference scripts with rotated placeholders

## Local Development

### Backend

1. Create a virtualenv with Python 3.9+.
2. Install dependencies:

```bash
pip install -e backend
```

3. Set environment variables:

```bash
export DISCOGS_CONSUMER_KEY=...
export DISCOGS_CONSUMER_SECRET=...
```

4. Run the API:

```bash
uvicorn app.main:app --app-dir backend --reload
```

### Frontend

1. Install dependencies:

```bash
npm install --prefix frontend
```

2. Start Vite:

```bash
npm run dev --prefix frontend
```

The frontend expects the backend at `http://127.0.0.1:8421`.

