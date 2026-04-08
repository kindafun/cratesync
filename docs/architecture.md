---
title: architecture
type: note
permalink: discogs-migration/architecture
---

# Architecture

## Overview

CrateSync is a local-only macOS app. There is no hosted backend or cloud persistence.

```text
Dev:
Browser (React/Vite)          Backend (FastAPI)           External
  127.0.0.1:5173       <->     127.0.0.1:8421      <->    Discogs API
                                     |
                              SQLite (app_data/)
                              macOS Keychain

Packaged / built-frontend mode:
Browser (served by FastAPI)   Backend (FastAPI)           External
  127.0.0.1:8421       <->     127.0.0.1:8421      <->    Discogs API
                                     |
                              SQLite (app_data or
                              ~/Library/Application Support/CrateSync/)
                              macOS Keychain
```

## Backend

FastAPI lives under `backend/app/`.

| Module | Responsibility |
| --- | --- |
| `api/routes.py` | HTTP endpoints, background task triggers, sync progress surface |
| `services/discogs.py` | Discogs OAuth and collection API client |
| `services/jobs.py` | Copy, delete, rollback, and job execution state |
| `services/planner.py` | Preview logic, duplicate detection, blocking conflicts |
| `services/selection.py` | Selection and filter matching against synced snapshots |
| `services/exports.py` | CSV and JSON job reports written under `app_data/exports/` |
| `services/keychain.py` | macOS Keychain token storage |
| `repository.py` | SQLite reads and writes |
| `database.py` | Database initialization and migrations |
| `domain/models.py` | Pydantic models and shared backend types |
| `config.py` | Settings loaded from `.env` |

### Runtime model

- `POST /collections/{id}/sync` starts a background sync job and returns immediately.
- The frontend polls `GET /collections/{id}/sync-progress` until the sync reports `done` or `error`.
- Only one active migration job is allowed at a time.
- OAuth access tokens are never stored in SQLite; only Keychain references are persisted.
- When `DISCOGS_MIGRATION_SERVE_FRONTEND=1`, FastAPI serves the built frontend bundle from `frontend/dist` (or `DISCOGS_MIGRATION_FRONTEND_DIST_DIR`) and the frontend origin collapses to `BACKEND_ORIGIN`.

## Frontend

The frontend lives under `frontend/src/` and uses React 19, TypeScript 5.8, and Vite 7.

### App structure

- `App.tsx` is the state/render hub. It owns top-level refs, keyboard/pointer effects, inline render-only derivations, and the main JSX tree.
- State and async behavior are extracted into hooks under `frontend/src/hooks/`.
- Shared API contracts and request wrappers live under `frontend/src/lib/`.

### Hooks

| Hook | Responsibility |
| --- | --- |
| `useCollectionSnapshots` | Source/destination snapshot and item state; derives connected accounts |
| `useSelectionFilters` | Filter state, derived options, and add/remove filter behavior |
| `useMigrationPlan` | Plan config, selection state, overrides, and plan signatures |
| `useWorkspaceState` | Async handlers, polling, presets, preview state, jobs, and workspace status |

### Active components

| File | Responsibility |
| --- | --- |
| `App.tsx` | Root composition and workflow shell |
| `SourceSelectionSection.tsx` | Source table, filtering slot, and selection controls |
| `SnapshotSection.tsx` | Destination reference table |
| `ReviewSection.tsx` | Preview, blocking-conflict resolution, and launch controls |
| `JobConsoleSection.tsx` | Job history, summary, actions, and item results |
| `FilterKeyBlock.tsx` | Renders the correct control for a given filter key |
| `ui.tsx` | Shared primitives such as `Field`, `StatBlock`, `FilterBlock`, and `PillSelect` |

### Reference-only UI code

These files are retained as design-lab/reference components and are not part of the active app surface:

- `frontend/src/components/AccountConnections.tsx`
- `frontend/src/components/JobConsole.tsx`
- `frontend/src/components/PlannerPanel.tsx`
- `frontend/src/components/SnapshotExplorer.tsx`
- `frontend/src/__design_lab/`

## Data Storage

- SQLite: `app_data/discogs_migration.sqlite3`
- Exports: `app_data/exports/`
- OAuth tokens: macOS Keychain under `local.discogs-migration.tokens` by default
- Frozen macOS bundles default writable app data to `~/Library/Application Support/CrateSync/`.

## Authentication

Discogs uses OAuth 1.0a.

1. Frontend requests `GET /auth/discogs/start?role=source|destination`.
2. Backend stores the temporary request token in SQLite.
3. Frontend opens the Discogs authorization URL in a popup.
4. Discogs redirects to `GET /auth/discogs/callback`.
5. Backend exchanges the verifier for access tokens and stores them in the macOS Keychain.
6. The callback window posts a message back to the opener and closes.

## Configuration

Configuration is loaded from the project-root `.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DISCOGS_CONSUMER_KEY` | none | Discogs application key |
| `DISCOGS_CONSUMER_SECRET` | none | Discogs application secret |
| `BACKEND_ORIGIN` | `http://127.0.0.1:8421` | OAuth callback origin |
| `FRONTEND_ORIGIN` | `http://127.0.0.1:5173` in dev, `BACKEND_ORIGIN` in built-frontend mode | Allowed frontend origin |
| `DISCOGS_REQUEST_DELAY_SECONDS` | `1.1` | Rate-limit buffer between Discogs calls |
| `SNAPSHOT_STALE_HOURS` | `4` | Snapshot freshness threshold |
| `DISCOGS_MIGRATION_APP_DIR` | `app_data/` in source checkouts, `~/Library/Application Support/CrateSync/` in frozen bundles | Local app-data root |
| `DISCOGS_MIGRATION_DB_PATH` | `app_data/discogs_migration.sqlite3` in source checkouts | SQLite path |
| `DISCOGS_MIGRATION_EXPORT_DIR` | `app_data/exports/` in source checkouts | Report export directory |
| `DISCOGS_MIGRATION_SERVE_FRONTEND` | `0` in source checkouts, `1` in frozen bundles | Serve the built frontend bundle directly from FastAPI |
| `DISCOGS_MIGRATION_FRONTEND_DIST_DIR` | `frontend/dist` | Directory containing the built frontend bundle |
| `DISCOGS_KEYCHAIN_SERVICE` | `local.discogs-migration.tokens` | Keychain service name |
