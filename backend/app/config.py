from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = "Discogs Migration Local App"
    app_data_dir: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_APP_DIR",
            ROOT_DIR / "app_data",
        )
    )
    database_path: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_DB_PATH",
            ROOT_DIR / "app_data" / "discogs_migration.sqlite3",
        )
    )
    export_dir: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_EXPORT_DIR",
            ROOT_DIR / "app_data" / "exports",
        )
    )
    frontend_origin: str = os.environ.get("FRONTEND_ORIGIN", "http://127.0.0.1:5173")
    backend_origin: str = os.environ.get("BACKEND_ORIGIN", "http://127.0.0.1:8421")
    discogs_api_base: str = "https://api.discogs.com"
    discogs_authorize_url: str = "https://www.discogs.com/oauth/authorize"
    discogs_request_token_url: str = "https://api.discogs.com/oauth/request_token"
    discogs_access_token_url: str = "https://api.discogs.com/oauth/access_token"
    discogs_consumer_key: str = os.environ.get("DISCOGS_CONSUMER_KEY", "")
    discogs_consumer_secret: str = os.environ.get("DISCOGS_CONSUMER_SECRET", "")
    keychain_service: str = os.environ.get(
        "DISCOGS_KEYCHAIN_SERVICE", "local.discogs-migration.tokens"
    )
    request_delay_seconds: float = float(
        os.environ.get("DISCOGS_REQUEST_DELAY_SECONDS", "1.1")
    )
    snapshot_stale_hours: int = int(os.environ.get("SNAPSHOT_STALE_HOURS", "4"))

    def ensure_dirs(self) -> None:
        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        self.export_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
