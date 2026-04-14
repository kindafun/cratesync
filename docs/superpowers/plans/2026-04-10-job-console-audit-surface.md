# Job Console Audit Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `software-development/subagent-driven-development` to execute this plan task-by-task. Use `software-development/requesting-code-review` before the final commit.

**Goal:** Turn the Job console from a mostly ID-based technical result table into a collector-friendly audit surface that explains what happened, what still needs action, and how each release moved through the workflow.

**Architecture:** This pass should improve both the backend job-detail payload and the frontend presentation. The frontend currently receives `MigrationJobItem` rows that only expose IDs, status, destination folder, and message; that is not enough for an audit-first UI. Extend `JobDetailResponse` with snapshot-backed item context (artist, title, source folder name, and useful release metadata), keep existing polling behavior in `useWorkspaceState`, then recompose `JobConsoleSection` around three layers: job status summary, action affordances, and item-level audit evidence.

**Tech Stack:** FastAPI, Pydantic, SQLite repository layer, React 19, TypeScript 5.8, Vite 7, existing CSS token system

---

## Why this next

The review step is now clearer, so the next trust surface is execution history. Right now the active `JobConsoleSection` shows:
- job pills
- job summary stats
- a row table with `release_id`, `instance_id`, `destination_folder_id`, and `message`

That works for debugging, but not for a collector verifying migration outcomes. The UI should answer:
- What kind of job was this?
- Is it still active, blocked on delete confirmation, or fully done?
- Which releases succeeded, skipped, failed, rolled back, or drifted?
- What action should I take next, if any?

---

## Success criteria

After this work:
1. The Job console reads like an audit log for collectors, not a raw backend table.
2. The header explains the current job phase and any required next action.
3. Item rows identify releases by human-readable context, not just IDs.
4. Delete-confirmation and rollback states are unmistakable.
5. Backend tests cover the richer job-detail payload.
6. Frontend build and backend tests both pass.

---

## File map

| File | Change |
| --- | --- |
| `backend/app/domain/models.py` | Add a richer job-item detail model for API responses |
| `backend/app/repository.py` | Join `migration_job_items` back to `collection_item_snapshots` when building job detail |
| `backend/app/tests/test_jobs.py` | Add/adjust tests for enriched job-detail payload and route behavior |
| `backend/app/services/exports.py` | Decide whether exports should include the same human-readable fields; if yes, update CSV/JSON export columns |
| `frontend/src/lib/types.ts` | Mirror the richer job-detail item shape |
| `frontend/src/components/JobConsoleSection.tsx` | Recompose the console around audit summary, action state, and human-readable item evidence |
| `frontend/src/styles/features/job-console.css` | Add styling for the richer audit presentation |
| `docs/design-system.md` | Update implementation-facing guidance if the job console pattern changes durably |
| `.impeccable.md` | Update only if the durable product/design principle changes |

---

## Task 1: Enrich backend job-detail items with snapshot context

**Objective:** Give the frontend enough data to render artist/title/folder context without additional requests.

**Files:**
- Modify: `backend/app/domain/models.py`
- Modify: `backend/app/repository.py`
- Test: `backend/app/tests/test_jobs.py`

- [ ] **Step 1: Introduce a job-detail item model with human-readable snapshot fields**

In `backend/app/domain/models.py`, keep the persisted `MigrationJobItem` model for repository/storage concerns if useful, but introduce a response-facing model for `JobDetailResponse.items`, for example:

```python
class JobDetailItem(BaseModel):
    id: str
    job_id: str
    snapshot_item_id: str
    release_id: int
    instance_id: int
    source_folder_id: int
    source_folder_name: str | None = None
    destination_folder_id: int | None = None
    status: JobItemStatus
    attempt_count: int = 0
    destination_instance_id: int | None = None
    message: str | None = None
    updated_at: datetime
    artist: str
    title: str
    year: int | None = None
    date_added: datetime | None = None
```

Then update `JobDetailResponse.items` to use this richer model.

Do not remove fields the frontend already relies on.

- [ ] **Step 2: Join job items back to collection snapshot rows in `get_job_detail()`**

In `backend/app/repository.py`, replace the current `list_job_items(job_id)` usage inside `get_job_detail()` with a detail query that joins:
- `migration_job_items`
- `collection_item_snapshots`

using `snapshot_item_id`

The query should return the fields needed for the response-facing detail model. Keep ordering by `updated_at ASC` unless the audit design later proves another sort is better.

- [ ] **Step 3: Preserve the simpler item query for internal job-runner logic if needed**

If other code paths rely on the current `MigrationJobItem` shape, keep `list_job_items()` for those uses and add a new `list_job_detail_items()` method for API response building.

- [ ] **Step 4: Add backend tests for enriched job detail**

In `backend/app/tests/test_jobs.py`, add assertions that `repository.get_job_detail(job.id)` includes:
- artist
- title
- source folder name when present
- existing status/message/release identifiers

Also add a route-level assertion for `GET /jobs/{job_id}` if there is not already one covering the response shape.

- [ ] **Step 5: Run targeted backend tests**

```bash
python3 -m pytest backend/app/tests/test_jobs.py -q
```

Expected: passing tests, including new assertions for enriched job detail.

- [ ] **Step 6: Commit**

```bash
git add backend/app/domain/models.py backend/app/repository.py backend/app/tests/test_jobs.py
git commit -m "Enrich job detail items with snapshot audit context"
```

---

## Task 2: Decide and align export surface with the richer audit model

**Objective:** Keep exported reports aligned with the richer on-screen audit surface when that improves usability.

**Files:**
- Modify: `backend/app/services/exports.py`
- Test: `backend/app/tests/test_jobs.py` or export-related tests if present

- [ ] **Step 1: Evaluate export field parity**

Current exports only include raw IDs plus status/message. Decide whether the exported CSV/JSON should also include:
- artist
- title
- source folder name

Default recommendation: yes for exports, because these fields improve audit usability without changing migration semantics.

- [ ] **Step 2: Update export generation if parity is adopted**

If yes, update `ExportService.export_job()` so CSV headers and JSON output include the richer fields already returned by `get_job_detail()`.

- [ ] **Step 3: Add or update tests accordingly**

Assert that exported data includes the new human-readable fields if you added them.

- [ ] **Step 4: Run targeted backend tests**

```bash
python3 -m pytest backend/app/tests/test_jobs.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/exports.py backend/app/tests/test_jobs.py
git commit -m "Align job exports with audit-friendly detail fields"
```

---

## Task 3: Mirror the richer job-detail shape in frontend types

**Objective:** Make the frontend type system accurately reflect the richer backend payload before changing the UI.

**Files:**
- Modify: `frontend/src/lib/types.ts`

- [ ] **Step 1: Introduce a dedicated frontend job-detail item type if needed**

Replace or extend the current `MigrationJobItem` usage in `JobDetailResponse` so the frontend can access the new fields from backend task 1.

For example:

```ts
export interface JobDetailItem {
  id: string;
  job_id: string;
  snapshot_item_id: string;
  release_id: number;
  instance_id: number;
  source_folder_id: number;
  source_folder_name?: string | null;
  destination_folder_id?: number | null;
  status: string;
  attempt_count: number;
  destination_instance_id?: number | null;
  message?: string | null;
  updated_at: string;
  artist: string;
  title: string;
  year?: number | null;
  date_added?: string | null;
}
```

Then update `JobDetailResponse.items` to use it.

- [ ] **Step 2: Keep `MigrationJobItem` only if still needed elsewhere**

Do not keep duplicate frontend interfaces unless both serve real purposes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "Align frontend job detail types with audit payload"
```

---

## Task 4: Recompose `JobConsoleSection` around job-phase clarity

**Objective:** Make the top of the job console answer job status and required next action immediately.

**Files:**
- Modify: `frontend/src/components/JobConsoleSection.tsx`

- [ ] **Step 1: Replace the vague header note with explicit phase framing**

The current right-side note only shows formatted status or `Choose a recent job to inspect.` Replace this with clearer job-phase language that distinguishes:
- running copy
- awaiting delete confirmation
- running delete
- completed
- completed with issues
- failed

- [ ] **Step 2: Add an audit summary block under the header when a job is selected**

The selected-job area should start with a compact summary that includes:
- job name
- workflow mode
- created/started/finished timing as available
- a short audit-phase label
- any explicit required action (`Confirm delete`, `Roll back adds`, or none)

Do not turn this into a padded hero card; keep it consistent with the rest of the app’s structural language.

- [ ] **Step 3: Make action buttons read as next steps, not just utilities**

Keep existing actions:
- Roll back adds
- Confirm delete
- Export reports

But ensure they appear in a context where the reason for each action is obvious.

- [ ] **Step 4: Keep the recent-job pill strip, but strengthen scanability**

Each pill should remain compact, but ensure the selected state and per-job status are easy to scan.

- [ ] **Step 5: Improve the empty state**

If no job is selected, the empty state should frame the console as an audit/history surface, not a generic placeholder.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/JobConsoleSection.tsx
git commit -m "Recompose job console around audit phase clarity"
```

---

## Task 5: Replace the raw item table with audit-first evidence rows

**Objective:** Make item-level results legible and meaningful for collectors.

**Files:**
- Modify: `frontend/src/components/JobConsoleSection.tsx`

- [ ] **Step 1: Replace the current ID-heavy columns**

The current columns are:
- Release
- Instance
- Status
- Destination
- Message

Replace them with a more useful structure such as:
- Release (artist + title, optionally year)
- Source folder
- Outcome
- Destination
- Note

You may still surface release/instance IDs, but they should be secondary metadata, not primary labels.

- [ ] **Step 2: Render outcome states with clearer language**

Map backend item statuses into human-readable row labels where needed. Examples:
- copied
n- skipped
- delete failed
- rolled back
- deleted

Use existing `statusTone()` where it still fits, but don’t let raw underscore statuses dominate the UI.

- [ ] **Step 3: Surface retry/attempt context only when useful**

If `attempt_count > 1`, show that context subtly in the row note instead of giving it a dedicated dominant column.

- [ ] **Step 4: Keep rows compact but audit-friendly**

The table should stay dense. Use two-line cells or stacked metadata only where it materially improves understanding.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/JobConsoleSection.tsx
 git commit -m "Make job result rows collector-friendly and audit-first"
```

---

## Task 6: Style the richer audit console and sync docs

**Objective:** Support the new job-console structure with matching styling and update durable guidance if needed.

**Files:**
- Modify: `frontend/src/styles/features/job-console.css`
- Modify: `docs/design-system.md`
- Modify: `.impeccable.md` only if the durable principle changes

- [ ] **Step 1: Expand job-console feature CSS**

Add selectors for the new summary and audit table patterns, for example:
- `.job-phase-summary`
- `.job-phase-label`
- `.job-audit-table`
- `.job-release-cell`
- `.job-row-meta`

Only add selectors actually used by the active component.

- [ ] **Step 2: Keep the style structural, not dashboard-polished**

Use rules, spacing, and typography hierarchy to express job state. Avoid decorative fills or a monitoring-dashboard aesthetic.

- [ ] **Step 3: Update docs if the implementation changes shared guidance**

In `docs/design-system.md`, refine the current rule:
- `The job console should focus on toolbar, summary, and results; server-noise event feeds are not part of the main UI.`

Extend it if needed to note that the job console is an audit surface first, with human-readable release context and next-step actions.

Update `.impeccable.md` only if this introduces a durable principle beyond the existing “Operational noise is not product value” rule.

- [ ] **Step 4: Run verification**

```bash
python3 -m pytest backend/app/tests
npm run build --prefix frontend
```

Expected: backend tests pass and frontend production build succeeds.

- [ ] **Step 5: Manual sanity checks**

Verify these states if possible:
- no jobs yet
- completed copy job
- job awaiting delete confirmation
- completed-with-issues job
- selected job with failed item messages

- [ ] **Step 6: Commit**

```bash
git add frontend/src/styles/features/job-console.css docs/design-system.md .impeccable.md
git commit -m "Style and document job console audit surface"
```

---

## Out of scope for this plan

Do not bundle these unless implementation proves they are inseparable:
- changing job-runner semantics
- adding resume/cancel UI beyond what already exists
- reviving server event feeds in the main console
- reworking source/review sections again

---

## Recommended implementation note

Unlike the review pass, this one likely benefits from a small backend expansion first. The frontend cannot become truly audit-friendly while `JobDetailResponse.items` remains limited to raw migration row IDs and status metadata.
