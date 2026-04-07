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

| Module                  | Responsibility                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `api/routes.py`         | All HTTP endpoints                                                                       |
| `services/discogs.py`   | `DiscogsClient` — all Discogs API calls (OAuth1 via `requests_oauthlib`)                 |
| `services/jobs.py`      | `JobRunner` — copy and delete phases run in background threads                           |
| `services/planner.py`   | `MigrationPlanner` — preview logic, conflict detection                                   |
| `services/selection.py` | `SelectionEngine` + `CollectionNormalizer` — filter/select items, normalize API payloads |
| `services/exports.py`   | `ExportService` — write CSV and JSON exports to `app_data/exports/`                      |
| `services/keychain.py`  | `KeychainStore` — read/write OAuth tokens from macOS Keychain                            |
| `repository.py`         | All SQLite reads and writes, single `Repository` class                                   |
| `database.py`           | Database init, schema migrations                                                         |
| `domain/models.py`      | All Pydantic models and type aliases                                                     |
| `config.py`             | `Settings` dataclass, reads from `.env`                                                  |

## Frontend

**React 19 + Vite + TypeScript** (`frontend/src/`) on port 5173.

**Hooks** (`frontend/src/hooks/`) — state extracted from App.tsx:

| Hook                     | Responsibility                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `useCollectionSnapshots` | Source/destination snapshot + item state; derives `sourceAccount`/`destinationAccount`      |
| `useSelectionFilters`    | All 11 filter state vars, derived options, `addFilter`/`removeFilter`                       |
| `useMigrationPlan`       | Plan config, selection state, `currentPlan`/`currentPlanSignature`, selection handlers      |
| `useWorkspaceState`      | Async handlers (connect, sync, preview, job lifecycle), background effects, workspace state |

**Active components** (`frontend/src/components/`):

| File                         | Responsibility                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                    | Root component — calls 4 hooks, computes render-only derived values, owns DOM refs and keyboard/pointer effects |
| `SourceSelectionSection.tsx` | Virtualized source table with bulk-select and filter slot                                                       |
| `SnapshotSection.tsx`        | Destination reference table                                                                                     |
| `ReviewSection.tsx`          | Preview, conflict resolution, virtualized review table, launch                                                  |
| `JobConsoleSection.tsx`      | Job history strip and job detail                                                                                |
| `FilterKeyBlock.tsx`         | Renders the correct filter control for a given `FilterKey`                                                      |
| `ui.tsx`                     | Shared primitives: `FilterBlock`, `PillSelect`, `Field`, `StatBlock`                                            |

**Retained design-lab components** (not imported by App.tsx but preserved for reference):
`AccountConnections.tsx`, `SnapshotExplorer.tsx`, `PlannerPanel.tsx`, `JobConsole.tsx`

**Libraries** (`frontend/src/lib/`):

| File         | Responsibility                                     |
| ------------ | -------------------------------------------------- |
| `api.ts`     | All fetch calls to the backend                     |
| `oauth.ts`   | OAuth popup flow via `window.postMessage`          |
| `types.ts`   | TypeScript types mirroring backend Pydantic models |
| `filters.ts` | Filter building, option derivation, preset loading |
| `format.ts`  | Date, status, and capability formatting helpers    |

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

| Variable                        | Default                 | Purpose                                                   |
| ------------------------------- | ----------------------- | --------------------------------------------------------- |
| `DISCOGS_CONSUMER_KEY`          | —                       | Required. Discogs app key                                 |
| `DISCOGS_CONSUMER_SECRET`       | —                       | Required. Discogs app secret                              |
| `DISCOGS_REQUEST_DELAY_SECONDS` | `1.1`                   | Rate limit buffer between API calls                       |
| `SNAPSHOT_STALE_HOURS`          | `4`                     | How long before a collection snapshot is considered stale |
| `FRONTEND_ORIGIN`               | `http://127.0.0.1:5173` | CORS allowed origin                                       |
| `BACKEND_ORIGIN`                | `http://127.0.0.1:8421` | Used in OAuth callback                                    |
