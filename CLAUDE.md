# Claude Code Project Guide

## Scope
This repo is **CrateSync** even though the working directory is named `Discogs Migration`. `CLAUDE.md` is the canonical coding-agent instruction file. `.impeccable.md` is the canonical frontend design-context file.

## Commands
- Backend dev: `uvicorn app.main:app --app-dir backend --reload`
- Frontend dev: `npm run dev --prefix frontend`
- Backend tests: `python3 -m pytest backend/app/tests`
- Frontend build check: `npm run build --prefix frontend`

## Environment
- Backend serves on `127.0.0.1:8421`; Vite serves on `5173`.
- This is a local-only macOS tool. SQLite lives under `app_data/`, Discogs OAuth tokens belong in macOS Keychain.
- Do not swap to alternate app servers or ports unless the documented local endpoints are unavailable.

## Where To Look When Needed
- `docs/architecture.md` — backend data flow, repository/service boundaries, local SQLite model.
- `docs/migration-workflow.md` — copy/move job lifecycle, preview semantics, rollback/delete flow.
- `docs/dev-setup.md` — local run commands and environment setup.
- `docs/design-system.md` — frontend token/component patterns when making UI changes.
- `docs/project/CrateSync Project Identity.md` — repo-specific architecture decisions and what is "real" vs design-lab code.
- `docs/project/Grid Exploration Handoff.md` — active frontend branch direction; if you change frontend behavior/visuals, update this and `.impeccable.md` in the same pass.
- `docs/project/Frontend Backlog.md` — known UI tradeoffs and branch-specific follow-ups.

## Project-Specific Coding Standards
- `frontend/src/App.tsx` is an intentional state/render hub. Do not split it opportunistically; only extract when state ownership is being redesigned.
- Do not delete `frontend/src/components/AccountConnections.tsx`, `JobConsole.tsx`, `PlannerPanel.tsx`, or `SnapshotExplorer.tsx` just because `App.tsx` does not import them; they are retained design-lab/reference components.
- Keep shared frontend API/data contracts in `frontend/src/lib/types.ts` and request wrappers in `frontend/src/lib/api.ts`.
- Add backend tests under `backend/app/tests/` for planner/selection/service changes, and run `python3 -m pytest backend/app/tests` when backend behavior changes.
- Run `npm run build --prefix frontend` after frontend changes.

## Guardrails
- Do not overwrite user edits, revert unrelated changes, or restore deleted code without checking why it was removed.
- Verify file/symbol existence with `rg` before asserting architecture details; this repo has branch-specific docs and retained legacy files.
- Do not mock database behavior in backend tests; use real test database flows because mocked persistence has caused migration bugs.
- Preserve async sync semantics: `POST /collections/{id}/sync` starts work, and the frontend polls `GET /collections/{id}/sync-progress`.
- Do not store Discogs OAuth access tokens in SQLite; they belong in macOS Keychain only.
- For destructive local actions like clearing app data or deleting source-side releases, require deliberate confirmation and preserve a serious danger-state UI treatment.
- In this branch's frontend exploration, preserve the exposed grid, square geometry, collapsible sections, and stronger Review-step threshold unless intentionally changing the design direction.

## Git / GitHub
- "Commit to branch" means commit locally and push the current branch to `origin`.
- Keep commit subjects short and imperative, e.g. `Refine grid exploration UI`. For non-trivial changes, add a commit body that explains what changed, why, and how it was verified.
- Prefer non-interactive git commands; do not use `git reset --hard` or `git checkout --` unless explicitly requested.
- Stage and commit only the files relevant to the task. Leave unrelated dirty files untouched.
- For PRs, keep scope narrow, summarize user-facing impact, and list validation commands/results.

## Verification
- Frontend-only change: run `npm run build --prefix frontend`.
- Backend behavior change: run `python3 -m pytest backend/app/tests`.
- Docs-only change: no build/test command is required unless docs describe generated behavior that changed.
- If a verification command cannot be run, state that explicitly and say what remains unverified.

## Doc Sync
- If frontend implementation or visual direction changes, update `docs/project/Grid Exploration Handoff.md` and `.impeccable.md` in the same pass.
- If architecture or workflow behavior changes, update the matching file under `docs/` and cross-check `docs/project/CrateSync Project Identity.md`.
- Keep `AGENTS.md` as a shim only; update durable rules here in `CLAUDE.md`.
