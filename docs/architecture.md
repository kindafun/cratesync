---
title: architecture
type: note
permalink: discogs-migration/architecture
---

# Architecture

## Overview

CrateSync is a localhost macOS app. There is no cloud component — all data stays on the user's machine.

```
Browser (React/Vite)          Backend (FastAPI)           External
  127.0.0.1:5173       ←→     127.0.0.1:8421      ←→    Discogs API
                                     |
                              SQLite (app_data/)
                              macOS Keychain
```

## Backend

**FastAPI** (`backend/app/`) served by `uvicorn` on port 8421.

| Module | Responsibility |
|---|---|
| `api/routes.py` | All HTTP endpoints |
| `services/discogs.py` | `DiscogsClient` — all Discogs API calls (OAuth1 via `requests_oauthlib`) |
| `services/jobs.py` | `JobRunner` — copy and delete phases run in background threads |
| `services/planner.py` | `MigrationPlanner` — preview logic, conflict detection |
| `services/selection.py` | `SelectionEngine` + `CollectionNormalizer` — filter/select items, normalize API payloads |
| `services/exports.py` | `ExportService` — write CSV and JSON exports to `app_data/exports/` |
| `services/keychain.py` | `KeychainStore` — read/write OAuth tokens from macOS Keychain |
| `repository.py` | All SQLite reads and writes, single `Repository` class |
| `database.py` | Database init, schema migrations |
| `domain/models.py` | All Pydantic models and type aliases |
| `config.py` | `Settings` dataclass, reads from `.env` |

## Frontend

**React 19 + Vite + TypeScript** (`frontend/src/`) on port 5173.

| File | Responsibility |
|---|---|
| `App.tsx` | Root component, global state, orchestration |
| `components/AccountConnections.tsx` | Connect/disconnect Discogs accounts |
| `components/SnapshotExplorer.tsx` | Browse, filter, and select collection items |
| `components/PlannerPanel.tsx` | Configure migration plan, resolve conflicts |
| `components/JobConsole.tsx` | Live job progress and event log |
| `lib/api.ts` | All fetch calls to the backend |
| `lib/oauth.ts` | OAuth popup flow via `window.postMessage` |
| `lib/types.ts` | TypeScript types mirroring backend Pydantic models |
| `lib/filters.ts`, `lib/sort.ts`, `lib/format.ts` | Utility logic |

## Data Storage

- **SQLite** at `app_data/discogs_migration.sqlite3` — accounts, snapshots, jobs, events
- **macOS Keychain** — OAuth access tokens (service: `local.discogs-migration.tokens`)
- **Exports** at `app_data/exports/` — CSV and JSON job reports

## Authentication

Discogs uses OAuth 1.0a. The flow:

1. Frontend calls `GET /auth/discogs/start?role=source` → gets an authorization URL
2. Backend stores the request token in SQLite
3. Frontend opens the URL in a popup window
4. User approves on Discogs; Discogs redirects to `GET /auth/discogs/callback`
5. Backend exchanges the verifier for access tokens, stores them in Keychain
6. Callback page posts a message to the opener window; popup closes

Access tokens are referenced by Keychain key names stored in the `connected_accounts` table — never stored in the database directly.

## Configuration

All config in `.env` at the project root. Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `DISCOGS_CONSUMER_KEY` | — | Required. Discogs app key |
| `DISCOGS_CONSUMER_SECRET` | — | Required. Discogs app secret |
| `DISCOGS_REQUEST_DELAY_SECONDS` | `1.1` | Rate limit buffer between API calls |
| `SNAPSHOT_STALE_HOURS` | `4` | How long before a collection snapshot is considered stale |
| `FRONTEND_ORIGIN` | `http://127.0.0.1:5173` | CORS allowed origin |
| `BACKEND_ORIGIN` | `http://127.0.0.1:8421` | Used in OAuth callback |