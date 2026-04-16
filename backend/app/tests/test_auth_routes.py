from __future__ import annotations

from fastapi.testclient import TestClient

from app.api import routes
from app.database import Database
from app.domain.models import SaveSelectionPresetRequest, SelectionFilters
from app.main import app
from app.repository import Repository


class FakeDiscogsClient:
    def __init__(self) -> None:
        self.verified_tokens: list[str] = []

    def verify_user_token(self, user_token: str) -> dict[str, object]:
        self.verified_tokens.append(user_token)
        if user_token == "bad-token":
            raise ValueError("Discogs rejected that user token.")
        if user_token == "new-destination-token":
            return {"username": "destination-next", "id": 404}
        return {"username": "source-next", "id": 303}


class FakeKeychainStore:
    def __init__(self) -> None:
        self.secrets: dict[str, str] = {}
        self.deleted: list[str] = []

    def set_secret(self, key: str, secret: str) -> None:
        self.secrets[key] = secret

    def get_secret(self, key: str) -> str:
        return self.secrets[key]

    def delete_secret(self, key: str) -> None:
        self.deleted.append(key)
        self.secrets.pop(key, None)


def make_repository(tmp_path) -> Repository:
    database = Database(tmp_path / "test.sqlite3")
    database.init()
    return Repository(database)


def install_dependencies(monkeypatch, repository: Repository, discogs_client, keychain_store) -> None:
    monkeypatch.setattr(routes, "repository", repository)
    monkeypatch.setattr(routes, "discogs_client", discogs_client)
    monkeypatch.setattr(routes, "keychain_store", keychain_store)
    routes._pending_auth_connections.clear()


def test_verify_token_returns_identity_without_connecting_account(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    discogs_client = FakeDiscogsClient()
    keychain_store = FakeKeychainStore()
    install_dependencies(monkeypatch, repository, discogs_client, keychain_store)

    with TestClient(app) as client:
        response = client.post(
            "/auth/discogs/token/verify",
            json={"role": "source", "user_token": "source-token"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["username"] == "source-next"
    assert payload["discogs_user_id"] == 303
    assert payload["role"] == "source"
    assert payload["requires_replacement_confirmation"] is False
    assert payload["existing_account"] is None
    assert payload["verification_id"]
    assert repository.list_accounts() == []
    assert keychain_store.secrets == {}


def test_connect_token_requires_confirmation_before_replacing_existing_role_account(
    tmp_path, monkeypatch
):
    repository = make_repository(tmp_path)
    repository.upsert_connected_account(
        username="source-current",
        role="source",
        auth_type="oauth",
        discogs_user_id=101,
        token_key="source-current-token",
        token_secret_key="source-current-secret",
    )
    discogs_client = FakeDiscogsClient()
    keychain_store = FakeKeychainStore()
    install_dependencies(monkeypatch, repository, discogs_client, keychain_store)

    with TestClient(app) as client:
        verify_response = client.post(
            "/auth/discogs/token/verify",
            json={"role": "source", "user_token": "source-token"},
        )
        connect_response = client.post(
            "/auth/discogs/token/connect",
            json={"verification_id": verify_response.json()["verification_id"]},
        )

    assert verify_response.status_code == 200
    assert verify_response.json()["requires_replacement_confirmation"] is True
    assert verify_response.json()["existing_account"]["username"] == "source-current"
    assert connect_response.status_code == 409
    assert "confirm" in connect_response.json()["detail"].lower()
    accounts = repository.list_accounts()
    assert len(accounts) == 1
    assert accounts[0].username == "source-current"


def test_connect_token_replaces_existing_role_account_after_confirmation(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    previous = repository.upsert_connected_account(
        username="source-current",
        role="source",
        auth_type="oauth",
        discogs_user_id=101,
        token_key="source-current-token",
        token_secret_key="source-current-secret",
    )
    repository.replace_snapshot(previous.id, previous.username, [])
    repository.save_preset(
        SaveSelectionPresetRequest(
            name="Should be cleared",
            account_id=previous.id,
            filters=SelectionFilters(),
        )
    )
    discogs_client = FakeDiscogsClient()
    keychain_store = FakeKeychainStore()
    install_dependencies(monkeypatch, repository, discogs_client, keychain_store)

    with TestClient(app) as client:
        verify_response = client.post(
            "/auth/discogs/token/verify",
            json={"role": "source", "user_token": "source-token"},
        )
        connect_response = client.post(
            "/auth/discogs/token/connect",
            json={
                "verification_id": verify_response.json()["verification_id"],
                "confirm_replace": True,
            },
        )

    assert connect_response.status_code == 200
    payload = connect_response.json()
    assert payload["username"] == "source-next"
    assert payload["role"] == "source"
    assert payload["auth_type"] == "token"
    accounts = repository.list_accounts()
    assert len(accounts) == 1
    assert accounts[0].username == "source-next"
    assert repository.get_latest_snapshot_for_account(previous.id) is None
    assert repository.list_presets(previous.id) == []
    assert keychain_store.secrets["discogs-user-token-source-next"] == "source-token"
    assert keychain_store.deleted == ["source-current-token", "source-current-secret"]


def test_verify_token_rejects_account_already_connected_to_other_role(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    repository.upsert_connected_account(
        username="source-next",
        role="source",
        auth_type="oauth",
        discogs_user_id=101,
        token_key="source-next-token",
        token_secret_key="source-next-secret",
    )
    discogs_client = FakeDiscogsClient()
    keychain_store = FakeKeychainStore()
    install_dependencies(monkeypatch, repository, discogs_client, keychain_store)

    with TestClient(app) as client:
        response = client.post(
            "/auth/discogs/token/verify",
            json={"role": "destination", "user_token": "source-token"},
        )

    assert response.status_code == 409
    assert "already connected" in response.json()["detail"].lower()
