from app.services.selection import CollectionNormalizer


def test_normalizer_handles_discogs_notes_list():
    item = CollectionNormalizer.from_discogs_payload(
        "acct_1",
        "snap_1",
        {
            "id": 101,
            "instance_id": 5001,
            "folder_id": 1,
            "notes": [
                {"field_id": 1, "value": "Mint"},
                {"field_id": 2, "label": "Sleeve", "value": "VG+"},
            ],
            "basic_information": {
                "title": "Example",
                "artists": [{"name": "Artist"}],
                "labels": [],
                "formats": [],
                "genres": [],
            },
        },
    )

    assert item.notes is None
    assert item.custom_field_values == {"field_1": "Mint", "Sleeve": "VG+"}

