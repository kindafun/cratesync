from datetime import datetime, timezone

from app.domain.models import CollectionItemSnapshot, SelectionFilters
from app.services.selection import SelectionEngine


def make_item(item_id: str, folder_id: int, year: int, genres: list[str], labels: list[str], title: str):
    return CollectionItemSnapshot(
        id=item_id,
        snapshot_id="snap_1",
        account_id="acct_1",
        release_id=int(item_id[-1]),
        instance_id=int(item_id[-1]),
        folder_id=folder_id,
        date_added=datetime(2020, 1, int(item_id[-1]), tzinfo=timezone.utc),
        artist="Artist",
        title=title,
        year=year,
        genres=genres,
        labels=labels,
        formats=["Vinyl"],
    )


def test_union_selection_with_manual_exclusion():
    items = [
        make_item("item_1", 1, 1999, ["Electronic"], ["Warp"], "Alpha"),
        make_item("item_2", 2, 2001, ["Rock"], ["Matador"], "Beta"),
    ]
    filters = SelectionFilters(
        folder_ids=[1],
        labels=["Matador"],
        manual_exclude_snapshot_item_ids=["item_2"],
    )
    selected = SelectionEngine.select_items(items, filters)
    assert [item.id for item in selected] == ["item_1"]

