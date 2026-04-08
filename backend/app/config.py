from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")
BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", ROOT_DIR))
IS_FROZEN = bool(getattr(sys, "frozen", False))


def _env_flag(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _default_app_data_dir() -> Path:
    if IS_FROZEN:
        return Path.home() / "Library" / "Application Support" / "CrateSync"
    return ROOT_DIR / "app_data"


def _default_frontend_dist_dir() -> Path:
    return BUNDLE_DIR / "frontend" / "dist"


@dataclass(frozen=True)
class Settings:
    app_name: str = "CrateSync Local App"
    is_frozen: bool = IS_FROZEN
    app_data_dir: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_APP_DIR",
            _default_app_data_dir(),
        )
    )
    database_path: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_DB_PATH",
            _default_app_data_dir() / "discogs_migration.sqlite3",
        )
    )
    export_dir: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_EXPORT_DIR",
            _default_app_data_dir() / "exports",
        )
    )
    frontend_dist_dir: Path = Path(
        os.environ.get(
            "DISCOGS_MIGRATION_FRONTEND_DIST_DIR",
            _default_frontend_dist_dir(),
        )
    )
    serve_frontend_from_backend: bool = _env_flag(
        "DISCOGS_MIGRATION_SERVE_FRONTEND",
        IS_FROZEN,
    )
    frontend_origin_override: str = os.environ.get("FRONTEND_ORIGIN", "").strip()
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

    @property
    def frontend_origin(self) -> str:
        if self.serve_frontend_from_backend:
            return self.backend_origin
        return self.frontend_origin_override or "http://127.0.0.1:5173"

    @property
    def app_url(self) -> str:
        return self.backend_origin if self.serve_frontend_from_backend else self.frontend_origin

    def ensure_dirs(self) -> None:
        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.export_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
