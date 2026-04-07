---
title: migration-workflow
type: note
permalink: discogs-migration/migration-workflow
---

# Migration Workflow

## Modes

- **Copy**: add releases to the destination and leave the source untouched.
- **Move**: add releases to the destination, then delete them from the source after an explicit confirmation step.

## End-to-End Flow

### 1. Connect accounts

Connect one `source` account and one `destination` account through Discogs OAuth.

### 2. Sync collections

`POST /collections/{account_id}/sync`

- Fetches the full Discogs collection for the account.
- Normalizes each item into `CollectionItemSnapshot` records.
- Persists a point-in-time snapshot locally.
- Reports progress through `GET /collections/{account_id}/sync-progress`.

Snapshots become stale after 4 hours by default.

### 3. Curate the source scope

The frontend lets the user narrow the source snapshot with folder, genre, label, format, style, date, and free-text filters, then manually refine the selection from the source table.

### 4. Preview the plan

`POST /migration-plans/preview`

`MigrationPlanner.preview()`:

- applies the current filters and selection to the synced source snapshot
- identifies duplicates already present in the destination
- detects blocking conflicts that must be resolved before launch
- returns metadata capability information for the review step

Blocking conflicts:

- `folder_mapping`: the destination has multiple folders with the same name
- `custom_field_mapping`: source custom fields need explicit destination mapping

The user resolves conflicts through `folder_mapping_overrides` and `custom_field_mapping_overrides`.

### 5. Create the job

`POST /jobs`

- Re-runs the planner with the submitted request.
- Persists the job and selected items with status `draft`.
- Starts the copy phase in a background thread.

Only one active job is allowed at a time.

### 6. Copy phase

`JobRunner._run_copy()`

For each `pending` or `failed` item:

- `POST /users/{username}/collection/folders/{folder_id}/releases/{release_id}` on the destination account
- `200/201`: `copied` in copy mode, `awaiting_delete_confirmation` in move mode
- `422`: `skipped` because Discogs already has that release in the destination folder
- anything else: `failed`

Job status after copy:

- Copy mode: `completed` or `completed_with_issues`
- Move mode: `awaiting_delete_confirmation`

### 7. Confirm delete or roll back

Move mode requires an explicit gate before any source-side deletion.

- `POST /jobs/{job_id}/confirm-delete` starts the delete phase.
- `POST /jobs/{job_id}/rollback` removes copied items from the destination instead of deleting from the source.

Rollback is only available before delete begins.

### 8. Delete phase

`JobRunner._run_delete()`

For each `awaiting_delete_confirmation` or `delete_failed` item:

- `DELETE /users/{username}/collection/folders/{folder_id}/releases/{release_id}/instances/{instance_id}` on the source account
- `204`: `deleted`
- `404`: `delete_skipped_drift` because the source item changed outside the app
- anything else: `delete_failed`

Final job status becomes `completed`, `completed_with_issues`, or `failed`.

### 9. Export reports

`GET /exports/{job_id}`

Writes CSV and JSON reports to `app_data/exports/`. On macOS, the export flow also reveals the generated report in Finder.

## Job Statuses

```text
draft
  -> running_copy
       -> completed
       -> completed_with_issues
       -> awaiting_delete_confirmation
            -> running_delete
                 -> completed
                 -> completed_with_issues
            -> completed_with_issues   (after rollback)

failed
cancelled
```

## Item Statuses

| Status | Meaning |
| --- | --- |
| `pending` | Not yet processed |
| `copied` | Added to destination in copy mode |
| `skipped` | Already exists in the destination folder |
| `failed` | Discogs API error during copy |
| `awaiting_delete_confirmation` | Copied, waiting for delete confirmation |
| `deleted` | Removed from the source |
| `delete_skipped_drift` | Source item was already missing at delete time |
| `delete_failed` | Discogs API error during delete |
| `rolled_back` | Removed from the destination during rollback |

## Known Limits

- `date_added` cannot be preserved because the Discogs API does not allow writing it.
- Custom-field preservation is best effort and depends on destination field compatibility.
- Discogs allows one instance of a release per folder; duplicates are skipped, not overwritten.
- Discogs calls are paced with a default 1.1 second delay between requests.
