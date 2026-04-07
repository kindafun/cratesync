# Claude Code Project Guide

## Scope

This repo is **CrateSync** even though the working directory is named `Discogs Migration`. `CLAUDE.md` is the canonical coding-agent instruction file. `.impeccable.md` is the canonical frontend design-context file.

## Commands

- Backend dev: `uvicorn app.main:app --app-dir backend --reload`
- Frontend dev: `npm run dev --prefix frontend`
- Backend tests: `python3 -m pytest backend/app/tests`
- Frontend build check: `npm run build --prefix frontend`

For full setup and environment details, use `docs/dev-setup.md`.

## Code Quality

- Prefer correct, complete implementations over minimal ones.
- Use appropriate data structures and algorithms instead of brute-force workarounds.
- Fix root causes, not symptoms.
- If a request needs validation or error handling to be reliable, include it.

## Environment

- Backend serves on `127.0.0.1:8421`; Vite serves on `127.0.0.1:5173`.
- This is a local-only macOS tool.
- Do not swap to alternate app servers or ports unless the documented local endpoints are unavailable.

## Where To Look When Needed

- `docs/README.md` — documentation index
- `docs/dev-setup.md` — install, environment, run, test, and local-data behavior
- `docs/architecture.md` — backend/frontend boundaries, storage model, and auth flow
- `docs/migration-workflow.md` — copy/move lifecycle, preview semantics, rollback/delete flow
- `docs/design-system.md` — frontend tokens and implementation-facing UI rules
- `.impeccable.md` — durable design direction and UX constraints

## Project-Specific Coding Standards

- `frontend/src/App.tsx` is the state/render hub. Hook extraction is encouraged. Extract render components only when they have a clearly bounded prop interface.
- Keep hook-owned state and async workflow logic under `frontend/src/hooks/`.
- Keep shared frontend API/data contracts in `frontend/src/lib/types.ts` and request wrappers in `frontend/src/lib/api.ts`.
- Do not delete `frontend/src/components/AccountConnections.tsx`, `JobConsole.tsx`, `PlannerPanel.tsx`, or `SnapshotExplorer.tsx` just because `App.tsx` does not import them; they are retained design-lab/reference components.
- Design-lab explorations under `frontend/src/__design_lab/` are reference code, not the active app surface.
- Add backend tests under `backend/app/tests/` for planner, selection, service, or repository behavior changes.
- Run `npm run build --prefix frontend` after frontend changes.

## Guardrails

- Do not overwrite user edits, revert unrelated changes, or restore deleted code without checking why it was removed.
- Verify file and symbol existence with `rg` before asserting repo structure.
- Do not mock database behavior in backend tests; use real test database flows.
- Preserve async sync semantics: `POST /collections/{id}/sync` starts work, and the frontend polls `GET /collections/{id}/sync-progress`.
- Do not store Discogs OAuth access tokens in SQLite; they belong in macOS Keychain only.
- For destructive local actions like clearing app data or deleting source-side releases, require deliberate confirmation and preserve serious danger-state treatment.
- Preserve the current exposed-grid, square-geometry, light control-surface direction unless intentionally changing design direction.

## Git / GitHub

- "Commit to branch" means commit locally and push the current branch to `origin`.
- Keep commit subjects short and imperative, e.g. `Refine review status flow`.
- For non-trivial changes, add a commit body explaining what changed, why, and how it was verified.
- Prefer non-interactive git commands; do not use `git reset --hard` or `git checkout --` unless explicitly requested.
- Stage and commit only files relevant to the task. Leave unrelated dirty files untouched.
- For PRs, keep scope narrow, summarize user-facing impact, and list validation commands and results.

## Verification

- Frontend-only change: run `npm run build --prefix frontend`.
- Backend behavior change: run `python3 -m pytest backend/app/tests`.
- Docs-only change: no build/test command is required unless the docs describe behavior that changed and you need to confirm it.
- If a verification command cannot be run, state that explicitly and say what remains unverified.

## Doc Sync

- If frontend implementation or visual direction changes, update `docs/design-system.md` and `.impeccable.md` in the same pass when the change affects shared guidance.
- If architecture, setup, or workflow behavior changes, update the matching file under `docs/`.
- Keep `AGENTS.md` as a shim only; update durable coding-agent rules here in `CLAUDE.md`.
