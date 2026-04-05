---
title: CrateSync Project Identity
type: note
permalink: discogs-migration/project/crate-sync-project-identity
tags:
- project
- identity
- architecture
---

# CrateSync Project Identity

The working directory is "Discogs Migration" but the app is named **CrateSync**. GitHub repo: `kindafun/cratesync`, branch `main`.

## App.tsx is an intentional monolith (partially resolved)

`frontend/src/App.tsx` is ~1,250 lines after session 6. The large section components and primitive UI components have been extracted. What remains in App.tsx is all state, handlers, and the render JSX — including `AccountCard`, `FolderConflictCard`, `CustomFieldConflictCard`, and `deriveReviewState`. Further splitting requires state restructuring.

## src/components/ — what's real vs design lab

Four design lab variants are **not imported by App.tsx** — do not delete without confirming:
- `AccountConnections.tsx`, `JobConsole.tsx`, `PlannerPanel.tsx`, `SnapshotExplorer.tsx`

Six components extracted in sessions 5–6 are active and imported:
- `SnapshotSection.tsx`, `SourceSelectionSection.tsx`, `ReviewSection.tsx`, `JobConsoleSection.tsx`, `ui.tsx`

## Stack

- Frontend: React 19, TypeScript 5.8, Vite 7 — no UI library, pure CSS with custom design tokens
- Backend: FastAPI on `127.0.0.1:8421`
- Fonts: IBM Plex Sans (UI) + IBM Plex Serif (display/headings) on the active grid-exploration branch

## Sync architecture (session 6)

Collection sync is now async. `POST /collections/{id}/sync` starts a background task and returns immediately. The frontend polls `GET /collections/{id}/sync-progress` every 800ms until `status: "done"` or `status: "error"`. Progress is tracked in an in-memory dict in `routes.py` (fine for single-user local tool). The `DiscogsClient.paged_collection_items` method accepts an optional `on_progress(fetched, total)` callback called after each page.
