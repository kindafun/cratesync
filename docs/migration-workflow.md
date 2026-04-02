---
title: migration-workflow
type: note
permalink: discogs-migration/migration-workflow
---

# Migration Workflow

## Two Modes

- **Copy** — releases are added to the destination; source is untouched.
- **Move** — releases are added to the destination, then deleted from the source. The delete phase requires explicit user confirmation before it starts.

## End-to-End Flow

### 1. Connect Accounts
Connect at least one `source` account and one `destination` account via Discogs OAuth. Both can be different Discogs usernames.

### 2. Sync Collection
`POST /collections/{account_id}/sync`

Fetches all items from the source account's Discogs collection (all pages, sorted by date added descending). Normalizes the raw Discogs payload into `CollectionItemSnapshot` records and saves them as a **snapshot** — a point-in-time copy of the collection. Snapshots become stale after 4 hours (configurable).

### 3. Select Items
The frontend uses `SnapshotExplorer` to let the user filter items by folder, genre, format, label, style, year range, rating, date range, and free-text. The `SelectionEngine` applies these filters server-side during plan preview.

### 4. Preview Plan
`POST /migration-plans/preview`

`MigrationPlanner.preview()` runs:
- Applies selection filters to the snapshot
- Identifies duplicates (release IDs already in destination)
- Detects **blocking conflicts** that prevent the job from starting:
  - **folder_mapping** — destination has multiple folders with the same name; user must pick one
  - **custom_field_mapping** — source items have custom fields that need explicit destination mapping confirmation
- Returns warnings (e.g., `date_added` cannot be preserved — Discogs API limitation)

Blocking conflicts must be resolved via `folder_mapping_overrides` and `custom_field_mapping_overrides` before a job can be created.

### 5. Create Job
`POST /jobs`

- Re-runs the planner with the same request to ensure conflicts are resolved
- Persists the job and its items (`MigrationJobItem` per selected release) with status `pending`
- Starts the copy phase in a background thread

Only one active job is allowed at a time.

### 6. Copy Phase
`JobRunner._run_copy()` runs in a daemon thread.

For each `pending` or `failed` item:
- Calls `POST /users/{username}/collection/folders/{folder_id}/releases/{release_id}` on the **destination** account
- `200/201` → status: `copied` (copy mode) or `awaiting_delete_confirmation` (move mode), stores `destination_instance_id`
- `422` → status: `skipped` (release already exists in destination — Discogs enforces one instance per release per folder)
- other → status: `failed`

After all items are processed, the job transitions:
- **Copy mode** — `completed` (no failures) or `completed_with_issues`
- **Move mode** — `awaiting_delete_confirmation`

### 7. Confirm Delete (Move mode only)
User reviews what was copied and explicitly confirms. This is a deliberate gate — no delete happens automatically.

`POST /jobs/{job_id}/confirm-delete` starts the delete phase.

**Alternatively**, `POST /jobs/{job_id}/rollback` reverses the copy phase (deletes everything added to destination) and marks the job `completed_with_issues`. Rollback is only available before the delete phase starts.

### 8. Delete Phase (Move mode only)
`JobRunner._run_delete()` runs in a daemon thread.

For each `awaiting_delete_confirmation` or `delete_failed` item:
- Calls `DELETE /users/{username}/collection/folders/{folder_id}/releases/{release_id}/instances/{instance_id}` on the **source** account using the original `instance_id` from the snapshot
- `204` → status: `deleted`
- `404` → status: `delete_skipped_drift` (item was already moved or deleted externally — flagged for manual review)
- other → status: `delete_failed`

Final status: `completed` or `completed_with_issues`.

### 9. Export
`GET /exports/{job_id}` writes a CSV and JSON report to `app_data/exports/` with full item-level detail.

## Job Statuses

```
draft
  └─ running_copy
       ├─ completed                    (copy mode, no failures)
       ├─ completed_with_issues        (copy mode, some failures)
       └─ awaiting_delete_confirmation (move mode)
            ├─ running_delete
            │    ├─ completed
            │    └─ completed_with_issues
            └─ completed_with_issues   (after rollback)
```

Also: `failed` (unhandled error), `cancelled`.

## Item Statuses

| Status | Meaning |
|---|---|
| `pending` | Not yet processed |
| `copied` | Added to destination (copy mode) |
| `skipped` | Already exists in destination folder |
| `failed` | Discogs API error during copy |
| `awaiting_delete_confirmation` | Copied, waiting for user to confirm delete (move mode) |
| `deleted` | Removed from source |
| `delete_skipped_drift` | Source item missing at delete time — needs manual review |
| `delete_failed` | Discogs API error during delete |
| `rolled_back` | Removed from destination during rollback |

## Known Limitations

- `date_added` cannot be preserved — Discogs API does not allow writing this field
- Custom field values are best-effort; destination account must have matching custom field names
- Discogs enforces one instance of a release per folder — duplicates are skipped, not overwritten
- Rate limiting: 1.1s delay between every Discogs API call (configurable via `DISCOGS_REQUEST_DELAY_SECONDS`)