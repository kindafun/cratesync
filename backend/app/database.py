from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator, Optional
from uuid import uuid4

from .config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utcnow().isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


def encode_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True)


def decode_json(value: Optional[str], default: Any) -> Any:
    if not value:
        return default
    return json.loads(value)


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.Lock()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def init(self) -> None:
        settings.ensure_dirs()
        with self.connect() as conn:
            conn.executescript(
                """
                PRAGMA journal_mode=WAL;

                CREATE TABLE IF NOT EXISTS oauth_requests (
                    request_token_key TEXT PRIMARY KEY,
                    request_token_secret TEXT NOT NULL,
                    role TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS connected_accounts (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    role TEXT NOT NULL,
                    discogs_user_id INTEGER,
                    token_key TEXT NOT NULL,
                    token_secret_key TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_synced_at TEXT
                );

                CREATE TABLE IF NOT EXISTS collection_snapshots (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    total_items INTEGER NOT NULL,
                    stale_after TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS collection_item_snapshots (
                    id TEXT PRIMARY KEY,
                    snapshot_id TEXT NOT NULL,
                    account_id TEXT NOT NULL,
                    release_id INTEGER NOT NULL,
                    instance_id INTEGER NOT NULL,
                    folder_id INTEGER NOT NULL,
                    folder_name TEXT,
                    date_added TEXT,
                    artist TEXT NOT NULL,
                    title TEXT NOT NULL,
                    year INTEGER,
                    labels_json TEXT NOT NULL,
                    genres_json TEXT NOT NULL,
                    formats_json TEXT NOT NULL,
                    rating INTEGER,
                    notes TEXT,
                    custom_field_values_json TEXT NOT NULL,
                    raw_payload_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS selection_presets (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    filters_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS migration_jobs (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    source_account_id TEXT NOT NULL,
                    destination_account_id TEXT NOT NULL,
                    snapshot_id TEXT NOT NULL,
                    workflow_mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    finished_at TEXT,
                    summary_json TEXT NOT NULL,
                    blocking_conflicts_json TEXT NOT NULL,
                    warnings_json TEXT NOT NULL,
                    metadata_capabilities_json TEXT NOT NULL,
                    serialized_plan_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS migration_job_items (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    snapshot_item_id TEXT NOT NULL,
                    release_id INTEGER NOT NULL,
                    instance_id INTEGER NOT NULL,
                    source_folder_id INTEGER NOT NULL,
                    destination_folder_id INTEGER,
                    status TEXT NOT NULL,
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    destination_instance_id INTEGER,
                    message TEXT,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS job_events (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )

    def save_oauth_request(
        self, request_token_key: str, request_token_secret: str, role: str
    ) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO oauth_requests
                (request_token_key, request_token_secret, role, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (request_token_key, request_token_secret, role, iso_now()),
            )

    def consume_oauth_request(self, request_token_key: str) -> Optional[sqlite3.Row]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM oauth_requests WHERE request_token_key = ?",
                (request_token_key,),
            ).fetchone()
            conn.execute(
                "DELETE FROM oauth_requests WHERE request_token_key = ?",
                (request_token_key,),
            )
            return row


db = Database(settings.database_path)
