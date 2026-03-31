from datetime import datetime, timezone
from typing import Optional

from app.domain.models import CollectionItemSnapshot, MigrationPlanPreviewRequest, SelectionFilters
from app.services.planner import MigrationPlanner


def make_item(
    item_id: str,
    *,
    release_id: int,
    folder_id: int,
    folder_name: str,
    custom_field_values: Optional[dict[str, str]] = None,
):
    return CollectionItemSnapshot(
        id=item_id,
        snapshot_id="snap_1",
        account_id="acct_1",
        release_id=release_id,
        instance_id=release_id,
        folder_id=folder_id,
        folder_name=folder_name,
        date_added=datetime(2020, 1, 1, tzinfo=timezone.utc),
        artist="Artist",
        title=f"Release {release_id}",
        year=2000,
        labels=["Warp"],
        genres=["Electronic"],
        formats=["Vinyl"],
        custom_field_values=custom_field_values or {},
    )


def test_preview_detects_duplicates_and_missing_custom_field_mapping():
    source_items = [make_item("item_1", release_id=101, folder_id=2, folder_name="Digital", custom_field_values={"Condition": "VG+"})]
    destination_items = [make_item("item_2", release_id=101, folder_id=5, folder_name="Digital")]

    response, destination_folder_ids = MigrationPlanner.preview(
        source_items=source_items,
        destination_items=destination_items,
        request=MigrationPlanPreviewRequest(
            source_account_id="acct_src",
            destination_account_id="acct_dst",
            snapshot_id="snap_1",
            filters=SelectionFilters(folder_ids=[2]),
        ),
    )

    assert response.selected_count == 1
    assert response.duplicate_release_ids == [101]
    assert destination_folder_ids["item_1"] == 1
    assert any(conflict.type == "custom_field_mapping" for conflict in response.blocking_conflicts)
