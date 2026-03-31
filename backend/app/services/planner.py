from __future__ import annotations

from collections import defaultdict
from typing import Optional, Tuple

from ..domain.models import (
    CollectionItemSnapshot,
    MigrationPlanPreviewRequest,
    MigrationPlanPreviewResponse,
    PreviewConflict,
    PreviewWarning,
)
from .selection import SelectionEngine


class MigrationPlanner:
    @staticmethod
    def preview(
        *,
        source_items: list[CollectionItemSnapshot],
        destination_items: list[CollectionItemSnapshot],
        request: MigrationPlanPreviewRequest,
    ) -> Tuple[MigrationPlanPreviewResponse, dict[str, Optional[int]]]:
        selected_items = SelectionEngine.select_items(source_items, request.filters)
        destination_release_ids = {item.release_id for item in destination_items}
        duplicate_release_ids = sorted(
            {item.release_id for item in selected_items if item.release_id in destination_release_ids}
        )

        folder_conflicts = MigrationPlanner._folder_conflicts(
            selected_items, destination_items, request.folder_mapping_overrides
        )
        custom_field_conflicts = MigrationPlanner._custom_field_conflicts(
            selected_items, request.custom_field_mapping_overrides
        )
        warnings = [
            PreviewWarning(
                code="date_added_not_preserved",
                message="Discogs does not let the app preserve original date_added values.",
            )
        ]
        metadata_capabilities = {
            "supports_date_added_write": False,
            "supports_folder_recreation": True,
            "custom_fields_best_effort": True,
            "duplicate_policy": "skip_and_log",
        }
        destination_folder_ids: dict[str, Optional[int]] = {
            item.id: request.folder_mapping_overrides.get(str(item.folder_id), 1)
            for item in selected_items
        }
        response = MigrationPlanPreviewResponse(
            snapshot_id=request.snapshot_id,
            selected_count=len(selected_items),
            retained_count=max(len(source_items) - len(selected_items), 0),
            duplicate_release_ids=duplicate_release_ids,
            selected_items=selected_items,
            warnings=warnings,
            blocking_conflicts=folder_conflicts + custom_field_conflicts,
            metadata_capabilities=metadata_capabilities,
        )
        return response, destination_folder_ids

    @staticmethod
    def _folder_conflicts(
        source_items: list[CollectionItemSnapshot],
        destination_items: list[CollectionItemSnapshot],
        overrides: dict[str, int],
    ) -> list[PreviewConflict]:
        conflicts: list[PreviewConflict] = []
        destination_folder_names = defaultdict(set)
        for item in destination_items:
            if item.folder_name:
                destination_folder_names[item.folder_name.lower()].add(item.folder_id)

        for folder_id, folder_name in sorted(
            {(item.folder_id, item.folder_name or f"Folder {item.folder_id}") for item in source_items}
        ):
            matches = destination_folder_names.get(folder_name.lower(), set())
            if len(matches) > 1 and str(folder_id) not in overrides:
                conflicts.append(
                    PreviewConflict(
                        type="folder_mapping",
                        message=f"Destination has multiple folders named '{folder_name}'. Explicit mapping is required.",
                        payload={"source_folder_id": folder_id, "folder_name": folder_name, "destination_folder_ids": sorted(matches)},
                    )
                )
        return conflicts

    @staticmethod
    def _custom_field_conflicts(
        source_items: list[CollectionItemSnapshot],
        overrides: dict[str, str],
    ) -> list[PreviewConflict]:
        field_names = set()
        for item in source_items:
            field_names.update(item.custom_field_values.keys())
        conflicts: list[PreviewConflict] = []
        for name in sorted(field_names):
            if not overrides.get(name):
                conflicts.append(
                    PreviewConflict(
                        type="custom_field_mapping",
                        message=f"Custom field '{name}' needs explicit destination mapping confirmation.",
                        payload={"field_name": name},
                    )
                )
        return conflicts
