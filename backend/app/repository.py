from __future__ import annotations

from datetime import timedelta
from typing import Any, Optional

from .config import settings
from .database import Database, decode_json, encode_json, iso_now, make_id, utcnow
from .domain.models import (
    CollectionItemSnapshot,
    CollectionSnapshot,
    ConnectedAccount,
    JobDetailItem,
    JobDetailResponse,
    JobEvent,
    MigrationJob,
    MigrationJobItem,
    MigrationPlanPreviewRequest,
    PreviewConflict,
    PreviewWarning,
    SaveSelectionPresetRequest,
    SelectionFilters,
    SelectionPreset,
)


def _maybe_dt(value: Optional[str]):
    return None if not value else value


class Repository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def upsert_connected_account(
        self,
        *,
        username: str,
        role: str,
        discogs_user_id: Optional[int],
        token_key: str,
        token_secret_key: str,
    ) -> ConnectedAccount:
        existing = self.find_account_by_username(username)
        account_id = existing.id if existing else make_id("acct")
        created_at = existing.created_at.isoformat() if existing else iso_now()
        updated_at = iso_now()
        with self.database.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO connected_accounts
                (id, username, role, discogs_user_id, token_key, token_secret_key, created_at, updated_at, last_synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    account_id,
                    username,
                    role,
                    discogs_user_id,
                    token_key,
                    token_secret_key,
                    created_at,
                    updated_at,
                    existing.last_synced_at.isoformat() if existing and existing.last_synced_at else None,
                ),
            )
        return self.get_account(account_id)

    def list_accounts(self) -> list[ConnectedAccount]:
        with self.database.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM connected_accounts ORDER BY created_at ASC"
            ).fetchall()
        return [self._row_to_account(row) for row in rows]

    def get_account(self, account_id: str) -> ConnectedAccount:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT * FROM connected_accounts WHERE id = ?", (account_id,)
            ).fetchone()
        if not row:
            raise KeyError(f"Unknown account {account_id}")
        return self._row_to_account(row)

    def find_account_by_username(self, username: str) -> Optional[ConnectedAccount]:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT * FROM connected_accounts WHERE username = ?", (username,)
            ).fetchone()
        return self._row_to_account(row) if row else None

    def delete_account(self, account_id: str) -> None:
        with self.database.connect() as conn:
            conn.execute("DELETE FROM connected_accounts WHERE id = ?", (account_id,))

    def replace_snapshot(
        self, account_id: str, username: str, items: list[CollectionItemSnapshot]
    ) -> CollectionSnapshot:
        snapshot_id = make_id("snap")
        created_at = utcnow()
        stale_after = created_at + timedelta(hours=settings.snapshot_stale_hours)
        with self.database.connect() as conn:
            conn.execute(
                "DELETE FROM collection_item_snapshots WHERE account_id = ?", (account_id,)
            )
            conn.execute("DELETE FROM collection_snapshots WHERE account_id = ?", (account_id,))
            conn.execute(
                """
                INSERT INTO collection_snapshots
                (id, account_id, username, created_at, total_items, stale_after)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot_id,
                    account_id,
                    username,
                    created_at.isoformat(),
                    len(items),
                    stale_after.isoformat(),
                ),
            )
            for item in items:
                conn.execute(
                    """
                    INSERT INTO collection_item_snapshots
                    (id, snapshot_id, account_id, release_id, instance_id, folder_id, folder_name, date_added, artist, title, year,
                     labels_json, genres_json, formats_json, styles_json, rating, notes, custom_field_values_json, raw_payload_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        item.id,
                        snapshot_id,
                        account_id,
                        item.release_id,
                        item.instance_id,
                        item.folder_id,
                        item.folder_name,
                        item.date_added.isoformat() if item.date_added else None,
                        item.artist,
                        item.title,
                        item.year,
                        encode_json(item.labels),
                        encode_json(item.genres),
                        encode_json(item.formats),
                        encode_json(item.styles),
                        item.rating,
                        item.notes,
                        encode_json(item.custom_field_values),
                        encode_json(item.raw_payload),
                    ),
                )
            conn.execute(
                "UPDATE connected_accounts SET last_synced_at = ?, updated_at = ? WHERE id = ?",
                (created_at.isoformat(), created_at.isoformat(), account_id),
            )
        return self.get_snapshot(snapshot_id)

    def get_latest_snapshot_for_account(self, account_id: str) -> Optional[CollectionSnapshot]:
        with self.database.connect() as conn:
            row = conn.execute(
                """
                SELECT * FROM collection_snapshots
                WHERE account_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (account_id,),
            ).fetchone()
        return self._row_to_snapshot(row) if row else None

    def get_snapshot(self, snapshot_id: str) -> CollectionSnapshot:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT * FROM collection_snapshots WHERE id = ?", (snapshot_id,)
            ).fetchone()
        if not row:
            raise KeyError(f"Unknown snapshot {snapshot_id}")
        return self._row_to_snapshot(row)

    def list_snapshot_items(self, snapshot_id: str) -> list[CollectionItemSnapshot]:
        with self.database.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM collection_item_snapshots
                WHERE snapshot_id = ?
                ORDER BY artist COLLATE NOCASE ASC, title COLLATE NOCASE ASC
                """,
                (snapshot_id,),
            ).fetchall()
        return [self._row_to_item(row) for row in rows]

    def save_preset(self, payload: SaveSelectionPresetRequest) -> SelectionPreset:
        preset_id = make_id("preset")
        now = utcnow().isoformat()
        with self.database.connect() as conn:
            conn.execute(
                """
                INSERT INTO selection_presets
                (id, account_id, name, filters_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    preset_id,
                    payload.account_id,
                    payload.name,
                    payload.filters.model_dump_json(),
                    now,
                    now,
                ),
            )
        return self.list_presets(payload.account_id)[-1]

    def list_presets(self, account_id: str) -> list[SelectionPreset]:
        with self.database.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM selection_presets WHERE account_id = ? ORDER BY name ASC",
                (account_id,),
            ).fetchall()
        return [self._row_to_preset(row) for row in rows]

    def create_job(
        self,
        plan: MigrationPlanPreviewRequest,
        *,
        blocking_conflicts: list[PreviewConflict],
        warnings: list[PreviewWarning],
        metadata_capabilities: dict[str, Any],
        selected_items: list[CollectionItemSnapshot],
        destination_folder_ids: dict[str, Optional[int]],
    ) -> MigrationJob:
        job_id = make_id("job")
        now = utcnow().isoformat()
        with self.database.connect() as conn:
            conn.execute(
                """
                INSERT INTO migration_jobs
                (id, name, source_account_id, destination_account_id, snapshot_id, workflow_mode, status,
                 created_at, updated_at, summary_json, blocking_conflicts_json, warnings_json,
                 metadata_capabilities_json, serialized_plan_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job_id,
                    plan.name,
                    plan.source_account_id,
                    plan.destination_account_id,
                    plan.snapshot_id,
                    plan.workflow_mode,
                    "draft",
                    now,
                    now,
                    encode_json({}),
                    encode_json([item.model_dump() for item in blocking_conflicts]),
                    encode_json([item.model_dump() for item in warnings]),
                    encode_json(metadata_capabilities),
                    plan.model_dump_json(),
                ),
            )
            for item in selected_items:
                conn.execute(
                    """
                    INSERT INTO migration_job_items
                    (id, job_id, snapshot_item_id, release_id, instance_id, source_folder_id, destination_folder_id, status, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        make_id("jobitem"),
                        job_id,
                        item.id,
                        item.release_id,
                        item.instance_id,
                        item.folder_id,
                        destination_folder_ids.get(item.id),
                        "pending",
                        now,
                    ),
                )
        return self.get_job(job_id)

    def get_job(self, job_id: str) -> MigrationJob:
        with self.database.connect() as conn:
            row = conn.execute(
                "SELECT * FROM migration_jobs WHERE id = ?", (job_id,)
            ).fetchone()
        if not row:
            raise KeyError(f"Unknown job {job_id}")
        return self._row_to_job(row)

    def list_jobs(self) -> list[MigrationJob]:
        with self.database.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM migration_jobs ORDER BY created_at DESC"
            ).fetchall()
        return [self._row_to_job(row) for row in rows]

    def update_job_status(
        self,
        job_id: str,
        *,
        status: str,
        summary: Optional[dict[str, int]] = None,
        started: bool = False,
        finished: bool = False,
    ) -> None:
        job = self.get_job(job_id)
        started_at = job.started_at.isoformat() if job.started_at else None
        finished_at = job.finished_at.isoformat() if job.finished_at else None
        if started and not started_at:
            started_at = iso_now()
        if finished:
            finished_at = iso_now()
        with self.database.connect() as conn:
            conn.execute(
                """
                UPDATE migration_jobs
                SET status = ?, updated_at = ?, started_at = ?, finished_at = ?, summary_json = ?
                WHERE id = ?
                """,
                (
                    status,
                    iso_now(),
                    started_at,
                    finished_at,
                    encode_json(summary if summary is not None else job.summary),
                    job_id,
                ),
            )

    def list_job_items(self, job_id: str) -> list[MigrationJobItem]:
        with self.database.connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM migration_job_items
                WHERE job_id = ?
                ORDER BY updated_at ASC
                """,
                (job_id,),
            ).fetchall()
        return [self._row_to_job_item(row) for row in rows]

    def update_job_item(
        self,
        item_id: str,
        *,
        status: str,
        message: Optional[str] = None,
        destination_instance_id: Optional[int] = None,
        increment_attempt: bool = True,
    ) -> None:
        with self.database.connect() as conn:
            current = conn.execute(
                "SELECT attempt_count FROM migration_job_items WHERE id = ?", (item_id,)
            ).fetchone()
            attempts = (current["attempt_count"] if current else 0) + (
                1 if increment_attempt else 0
            )
            conn.execute(
                """
                UPDATE migration_job_items
                SET status = ?, message = ?, destination_instance_id = COALESCE(?, destination_instance_id),
                    attempt_count = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, message, destination_instance_id, attempts, iso_now(), item_id),
            )

    def add_job_event(self, job_id: str, level: str, message: str) -> None:
        with self.database.connect() as conn:
            conn.execute(
                """
                INSERT INTO job_events
                (id, job_id, level, message, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (make_id("event"), job_id, level, message, iso_now()),
            )

    def list_job_events(self, job_id: str) -> list[JobEvent]:
        with self.database.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM job_events WHERE job_id = ? ORDER BY created_at ASC",
                (job_id,),
            ).fetchall()
        return [self._row_to_event(row) for row in rows]

    def list_job_detail_items(self, job_id: str) -> list[JobDetailItem]:
        with self.database.connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    mji.*,
                    cis.folder_name AS source_folder_name,
                    cis.artist AS artist,
                    cis.title AS title,
                    cis.year AS year,
                    cis.date_added AS date_added
                FROM migration_job_items AS mji
                JOIN collection_item_snapshots AS cis
                    ON cis.id = mji.snapshot_item_id
                WHERE mji.job_id = ?
                ORDER BY mji.updated_at ASC
                """,
                (job_id,),
            ).fetchall()
        return [self._row_to_job_detail_item(row) for row in rows]

    def get_job_detail(self, job_id: str) -> JobDetailResponse:
        return JobDetailResponse(
            job=self.get_job(job_id),
            items=self.list_job_detail_items(job_id),
            events=self.list_job_events(job_id),
        )

    def active_job_exists(self) -> bool:
        with self.database.connect() as conn:
            row = conn.execute(
                """
                SELECT 1
                FROM migration_jobs
                WHERE status IN ('draft', 'running_copy', 'awaiting_delete_confirmation', 'running_delete')
                LIMIT 1
                """
            ).fetchone()
        return row is not None

    def clear_all_local_data(self) -> None:
        with self.database.connect() as conn:
            for table in (
                "oauth_requests",
                "connected_accounts",
                "collection_snapshots",
                "collection_item_snapshots",
                "selection_presets",
                "migration_jobs",
                "migration_job_items",
                "job_events",
            ):
                conn.execute(f"DELETE FROM {table}")

    def _row_to_account(self, row) -> ConnectedAccount:
        return ConnectedAccount.model_validate(dict(row))

    def _row_to_snapshot(self, row) -> CollectionSnapshot:
        return CollectionSnapshot.model_validate(dict(row))

    def _row_to_item(self, row) -> CollectionItemSnapshot:
        payload = dict(row)
        payload["labels"] = decode_json(payload.pop("labels_json"), [])
        payload["genres"] = decode_json(payload.pop("genres_json"), [])
        payload["formats"] = decode_json(payload.pop("formats_json"), [])
        payload["styles"] = decode_json(payload.pop("styles_json", None), [])
        payload["custom_field_values"] = decode_json(
            payload.pop("custom_field_values_json"), {}
        )
        payload["raw_payload"] = decode_json(payload.pop("raw_payload_json"), {})
        return CollectionItemSnapshot.model_validate(payload)

    def _row_to_preset(self, row) -> SelectionPreset:
        payload = dict(row)
        payload["filters"] = SelectionFilters.model_validate_json(payload.pop("filters_json"))
        return SelectionPreset.model_validate(payload)

    def _row_to_job(self, row) -> MigrationJob:
        payload = dict(row)
        payload["summary"] = decode_json(payload.pop("summary_json"), {})
        payload["blocking_conflicts"] = decode_json(
            payload.pop("blocking_conflicts_json"), []
        )
        payload["warnings"] = decode_json(payload.pop("warnings_json"), [])
        payload["metadata_capabilities"] = decode_json(
            payload.pop("metadata_capabilities_json"), {}
        )
        payload.pop("serialized_plan_json")
        return MigrationJob.model_validate(payload)

    def _row_to_job_item(self, row) -> MigrationJobItem:
        return MigrationJobItem.model_validate(dict(row))

    def _row_to_job_detail_item(self, row) -> JobDetailItem:
        return JobDetailItem.model_validate(dict(row))

    def _row_to_event(self, row) -> JobEvent:
        return JobEvent.model_validate(dict(row))
