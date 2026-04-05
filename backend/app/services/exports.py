from __future__ import annotations

import csv
import json
import subprocess
from pathlib import Path

from ..config import settings
from ..repository import Repository


class ExportService:
    def __init__(self, repository: Repository) -> None:
        self.repository = repository

    def export_job(self, job_id: str) -> tuple[Path, Path]:
        detail = self.repository.get_job_detail(job_id)
        settings.ensure_dirs()
        csv_path = settings.export_dir / f"{job_id}.csv"
        json_path = settings.export_dir / f"{job_id}.json"

        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=[
                    "snapshot_item_id",
                    "release_id",
                    "instance_id",
                    "source_folder_id",
                    "destination_folder_id",
                    "status",
                    "attempt_count",
                    "destination_instance_id",
                    "message",
                    "updated_at",
                ],
            )
            writer.writeheader()
            for item in detail.items:
                writer.writerow(item.model_dump())

        with json_path.open("w", encoding="utf-8") as handle:
            json.dump(detail.model_dump(mode="json"), handle, indent=2)

        subprocess.Popen(["open", "-R", str(csv_path)])
        return csv_path, json_path

