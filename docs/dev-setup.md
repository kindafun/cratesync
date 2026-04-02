---
title: dev-setup
type: note
permalink: discogs-migration/dev-setup
---

# Dev Setup

## Prerequisites

- Python 3.9+
- Node.js 18+
- A Discogs developer application (create one at discogs.com/settings/developers)
  - Set the callback URL to `http://127.0.0.1:8421/auth/discogs/callback`

## Environment

Copy `.env.example` to `.env` and fill in:

```
DISCOGS_CONSUMER_KEY=your_key
DISCOGS_CONSUMER_SECRET=your_secret
```

All other variables have working defaults for local development.

## Backend

```bash
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --port 8421 --reload
```

The backend starts at `http://127.0.0.1:8421`. On first run it creates `app_data/` and initializes the SQLite database.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://127.0.0.1:5173`.

## Running Tests

```bash
cd backend
pytest
```

## Data

- SQLite database: `app_data/discogs_migration.sqlite3`
- Exports: `app_data/exports/`
- OAuth tokens: stored in macOS Keychain under service `local.discogs-migration.tokens`

To wipe all local data (accounts, snapshots, jobs) and Keychain tokens, use the "Clear local data" action in the app, or call `DELETE /local-data`.