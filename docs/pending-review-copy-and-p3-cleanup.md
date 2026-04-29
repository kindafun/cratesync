# Pending Review Copy And P3 Cleanup

This note captures the remaining known issues after the P1 and P2 cleanup passes so a future session can pick them up without redoing the audit.

## Frontend Review Copy Cleanup

Command:

```bash
node --experimental-strip-types --test frontend/tests/*.test.ts
```

Current result after this cleanup:

- 17 tests run
- 17 pass
- 0 fail

Updated file:

- `frontend/src/lib/reviewPresentation.ts`

The previous copy expectation mismatches in `frontend/tests/reviewPresentation.test.ts` are resolved. `npm run build --prefix frontend` also passes.

### 1. Ready-state title copy

Test:

- `deriveReviewState keeps ready-state copy short and operational`

Expected:

```text
Ready to launch
```

Previous actual:

```text
Ready to start
```

Implementation:

- `frontend/src/lib/reviewPresentation.ts`
- `deriveReviewState()` ready branch

Decision:

- Standardized the review gate on "launch" language.

### 2. Blockers title copy

Test:

- `review support copy is concise and user-oriented`

Expected:

```text
Resolve before launch
Resolve before launch (2)
```

Previous actual:

```text
Resolve before start
Resolve before start (2)
```

Implementation:

- `frontend/src/lib/reviewPresentation.ts`
- `getReviewBlockersTitle()`

Decision:

- Standardized blocker headings on "launch" language.

### 3. Custom-field blocker title copy

Test:

- `blocker card copy turns raw identifiers into explicit tasks`

Expected:

```text
Map source field "field_1"
```

Previous actual:

```text
Map field "field_1"
```

Implementation:

- `frontend/src/lib/reviewPresentation.ts`
- `getReviewCustomFieldConflictTitle()`

Decision:

- Changed implementation to `Map source field "${fieldName}"`.

## Remaining P3 Findings

The audit’s P3 item was architectural risk from large state hubs. This is not currently blocking behavior, but it increases future regression cost.

### Large Frontend State Hub

Files:

- `frontend/src/App.tsx`
- `frontend/src/hooks/useWorkspaceState.ts`

Current risks:

- Account connection, sync polling, preview generation, job lifecycle, retry state, presets, document title updates, and local-data clearing are concentrated in one hook.
- `App.tsx` still owns broad composition and many derived render values.
- Future changes can easily add cross-cutting state coupling.

Suggested next cuts:

- Extract sync workflow and progress animation into `useCollectionSync`.
- Extract job polling/resume/confirm-delete/rollback/export into `useJobLifecycle`.
- Keep `App.tsx` as the render hub per `CLAUDE.md`, but reduce it to composition and stable derived render values.

Completed this pass:

- Extracted account connection flow from `useWorkspaceState.ts` into `frontend/src/hooks/useAccountConnections.ts`.

Suggested verification:

```bash
npm run build --prefix frontend
node --experimental-strip-types --test frontend/tests/*.test.ts
```

The full frontend test glob now passes after the review copy cleanup.

### Large Backend Route/Repository Hubs

Files:

- `backend/app/api/routes.py`
- `backend/app/repository.py`

Current risks:

- Auth, sync, planning, jobs, exports, and destructive local-data actions live in one route module.
- `Repository` owns account, snapshot, preset, job, event, and local-data persistence.
- The P1/P2 fixes added necessary safeguards but also added more responsibility to these hubs.

Suggested next cuts:

- Split routes into domain routers: auth, accounts/collections, planning, jobs, exports/local-data.
- Consider repository sub-services or narrow repository classes for accounts, snapshots, selections, and jobs.
- Keep database transaction boundaries explicit, especially around job creation and sync replacement.

Suggested verification:

```bash
python3 -m pytest backend/app/tests
```

## Recent Completed Context

P1 items fixed:

- Backend/frontend filter semantics now align on intersection.
- Duplicate sync starts are rejected.
- Active job creation is enforced inside the repository write path.
- Draft jobs are recoverable from the frontend.
- SQLite migration always backfills `styles_json`.

P2 items fixed:

- Rollback failures are visible as `rollback_failed`.
- Folder mapping no longer falls back silently to folder `1`.
- Undocumented `127.0.0.1:8000` API fallback removed.
- `?design_lab` is disabled in production builds.
- Sync progress completion wait is bounded.
