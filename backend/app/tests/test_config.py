from app.config import settings


def test_settings_paths_are_defined():
    assert settings.database_path.name.endswith(".sqlite3")
    assert settings.export_dir.name == "exports"

