from __future__ import annotations

from typing import Any

from .discogs import DiscogsClient
from ..database import make_id
from ..domain.models import CollectionItemSnapshot, SelectionFilters


class CollectionNormalizer:
    @staticmethod
    def from_discogs_payload(account_id: str, snapshot_id: str, payload: dict) -> CollectionItemSnapshot:
        basic = payload.get("basic_information", {})
        artists = basic.get("artists") or [{}]
        labels = [label.get("name", "") for label in basic.get("labels", []) if label.get("name")]
        formats = []
        for entry in basic.get("formats", []):
            name = entry.get("name")
            if name:
                formats.append(name)
            descriptions = entry.get("descriptions") or []
            formats.extend([value for value in descriptions if value])
        notes_text, custom_field_values = CollectionNormalizer._extract_notes_and_custom_fields(
            payload
        )
        return CollectionItemSnapshot(
            id=make_id("item"),
            snapshot_id=snapshot_id,
            account_id=account_id,
            release_id=payload["id"],
            instance_id=payload["instance_id"],
            folder_id=payload.get("folder_id", 1),
            folder_name=(payload.get("folder_name") or None),
            date_added=DiscogsClient.parse_discogs_datetime(payload.get("date_added")),
            artist=artists[0].get("name", "Unknown Artist"),
            title=basic.get("title", "Untitled"),
            year=basic.get("year"),
            labels=labels,
            genres=basic.get("genres", []),
            formats=formats,
            rating=payload.get("rating"),
            notes=notes_text,
            custom_field_values=custom_field_values,
            raw_payload=payload,
        )

    @staticmethod
    def _extract_notes_and_custom_fields(payload: dict[str, Any]) -> tuple[str | None, dict[str, Any]]:
        notes_value = payload.get("notes")
        custom_field_values: dict[str, Any] = {}
        notes_text: str | None = None

        if isinstance(notes_value, str):
            notes_text = notes_value
        elif isinstance(notes_value, list):
            for index, entry in enumerate(notes_value, start=1):
                if not isinstance(entry, dict):
                    continue
                field_name = (
                    entry.get("field_name")
                    or entry.get("name")
                    or entry.get("label")
                    or f"field_{entry.get('field_id', index)}"
                )
                custom_field_values[str(field_name)] = entry.get("value")

        for key in ("notes_custom_fields", "custom_fields"):
            raw_custom_fields = payload.get(key)
            if isinstance(raw_custom_fields, dict):
                custom_field_values.update(raw_custom_fields)
            elif isinstance(raw_custom_fields, list):
                for index, entry in enumerate(raw_custom_fields, start=1):
                    if not isinstance(entry, dict):
                        continue
                    field_name = (
                        entry.get("field_name")
                        or entry.get("name")
                        or entry.get("label")
                        or f"field_{entry.get('field_id', index)}"
                    )
                    custom_field_values[str(field_name)] = entry.get("value")

        return notes_text, custom_field_values


class SelectionEngine:
    @staticmethod
    def select_items(
        items: list[CollectionItemSnapshot],
        filters: SelectionFilters,
    ) -> list[CollectionItemSnapshot]:
        included_ids: set[str] = set(filters.manual_include_snapshot_item_ids)

        for item in items:
            if SelectionEngine._matches(item, filters):
                included_ids.add(item.id)

        excluded_ids = set(filters.manual_exclude_snapshot_item_ids)
        return [item for item in items if item.id in included_ids and item.id not in excluded_ids]

    @staticmethod
    def _matches(item: CollectionItemSnapshot, filters: SelectionFilters) -> bool:
        checks = []
        if filters.date_from:
            checks.append(item.date_added and item.date_added >= filters.date_from)
        if filters.date_to:
            checks.append(item.date_added and item.date_added <= filters.date_to)
        if filters.folder_ids:
            checks.append(item.folder_id in filters.folder_ids)
        if filters.genres:
            checks.append(bool(set(value.lower() for value in item.genres) & set(value.lower() for value in filters.genres)))
        if filters.labels:
            checks.append(bool(set(value.lower() for value in item.labels) & set(value.lower() for value in filters.labels)))
        if filters.formats:
            checks.append(bool(set(value.lower() for value in item.formats) & set(value.lower() for value in filters.formats)))
        if filters.year_min is not None:
            checks.append(item.year is not None and item.year >= filters.year_min)
        if filters.year_max is not None:
            checks.append(item.year is not None and item.year <= filters.year_max)
        if filters.rating_min is not None:
            checks.append(item.rating is not None and item.rating >= filters.rating_min)
        if filters.text_query:
            query = filters.text_query.lower()
            haystack = f"{item.artist} {item.title} {' '.join(item.labels)} {' '.join(item.genres)}".lower()
            checks.append(query in haystack)
        return any(checks)
