import json
from datetime import datetime, timezone
from typing import Optional

from fastapi.testclient import TestClient

from app.api import routes
from app.database import Database
from app.domain.models import CollectionItemSnapshot, MigrationPlanPreviewRequest
from app.main import app
from app.repository import Repository
from app.services.jobs import JobRunner
from app.services.planner import MigrationPlanner


class FakeResponse:
    def __init__(self, status_code: int, payload: Optional[dict] = None):
        self.status_code = status_code
        self._payload = payload or {}
        self.content = json.dumps(self._payload).encode("utf-8") if payload is not None else b""

    def json(self) -> dict:
        return self._payload


class FakeDiscogsClient:
    def __init__(
        self,
        *,
        add_responses: Optional[list[FakeResponse]] = None,
        delete_responses: Optional[list[FakeResponse]] = None,
    ) -> None:
        self.add_responses = list(add_responses or [])
        self.delete_responses = list(delete_responses or [])
        self.add_calls: list[dict] = []
        self.delete_calls: list[dict] = []

    def add_release(self, **kwargs):
        self.add_calls.append(kwargs)
        return self.add_responses.pop(0) if self.add_responses else FakeResponse(500)

    def delete_release_instance(self, **kwargs):
        self.delete_calls.append(kwargs)
        return self.delete_responses.pop(0) if self.delete_responses else FakeResponse(500)


class FakeKeychainStore:
    def get_secret(self, key: str) -> str:
        return f"secret-for-{key}"


class RecordingJobRunner:
    def __init__(self, repository: Repository) -> None:
        self.repository = repository
        self.started_job_ids: list[str] = []
        self.confirmed_job_ids: list[str] = []

    def start_copy(self, job_id: str) -> None:
        self.started_job_ids.append(job_id)

    def confirm_delete(self, job_id: str) -> None:
        self.confirmed_job_ids.append(job_id)
        self.repository.update_job_status(job_id, status="running_delete", started=True)


def make_item(
    item_id: str,
    *,
    account_id: str,
    release_id: int,
    folder_id: int = 1,
    folder_name: str = "Main",
    custom_field_values: Optional[dict[str, str]] = None,
) -> CollectionItemSnapshot:
    return CollectionItemSnapshot(
        id=item_id,
        snapshot_id="snap_pending",
        account_id=account_id,
        release_id=release_id,
        instance_id=release_id + 1000,
        folder_id=folder_id,
        folder_name=folder_name,
        date_added=datetime(2020, 1, 1, tzinfo=timezone.utc),
        artist="Artist",
        title=f"Release {release_id}",
        year=2000,
        labels=["Warp"],
        genres=["Electronic"],
        formats=["Vinyl"],
        styles=["Deep House"],
        custom_field_values=custom_field_values or {},
    )


def make_repository(tmp_path) -> Repository:
    database = Database(tmp_path / "test.sqlite3")
    database.init()
    return Repository(database)


def seed_accounts(repository: Repository):
    source = repository.upsert_connected_account(
        username="source-user",
        role="source",
        discogs_user_id=101,
        token_key="source-token",
        token_secret_key="source-secret",
    )
    destination = repository.upsert_connected_account(
        username="destination-user",
        role="destination",
        discogs_user_id=202,
        token_key="destination-token",
        token_secret_key="destination-secret",
    )
    return source, destination


def seed_snapshots(
    repository: Repository,
    *,
    source,
    destination,
    source_items: list[CollectionItemSnapshot],
    destination_items: Optional[list[CollectionItemSnapshot]] = None,
):
    source_snapshot = repository.replace_snapshot(source.id, source.username, source_items)
    repository.replace_snapshot(destination.id, destination.username, destination_items or [])
    return source_snapshot


def create_job(
    repository: Repository,
    *,
    source,
    destination,
    source_items: list[CollectionItemSnapshot],
    destination_items: Optional[list[CollectionItemSnapshot]] = None,
    workflow_mode: str = "copy",
    custom_field_mapping_overrides: Optional[dict[str, str]] = None,
):
    source_snapshot = seed_snapshots(
        repository,
        source=source,
        destination=destination,
        source_items=source_items,
        destination_items=destination_items,
    )
    plan = MigrationPlanPreviewRequest(
        source_account_id=source.id,
        destination_account_id=destination.id,
        snapshot_id=source_snapshot.id,
        workflow_mode=workflow_mode,
        custom_field_mapping_overrides=custom_field_mapping_overrides or {},
    )
    preview, destination_folder_ids = MigrationPlanner.preview(
        source_items=repository.list_snapshot_items(source_snapshot.id),
        destination_items=repository.list_snapshot_items(
            repository.get_latest_snapshot_for_account(destination.id).id
        ),
        request=plan,
    )
    assert preview.blocking_conflicts == []
    job = repository.create_job(
        plan,
        blocking_conflicts=preview.blocking_conflicts,
        warnings=preview.warnings,
        metadata_capabilities=preview.metadata_capabilities,
        selected_items=preview.selected_items,
        destination_folder_ids=destination_folder_ids,
    )
    return repository.get_job_detail(job.id)


def install_route_dependencies(monkeypatch, repository: Repository, job_runner) -> None:
    monkeypatch.setattr(routes, "repository", repository)
    monkeypatch.setattr(routes, "job_runner", job_runner)


def test_run_copy_marks_successful_copy_jobs_completed(tmp_path):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
    )
    runner = JobRunner(
        repository,
        FakeDiscogsClient(add_responses=[FakeResponse(201, {"instance_id": 9001})]),
        FakeKeychainStore(),
    )

    runner._run_copy(detail.job.id)

    detail = repository.get_job_detail(detail.job.id)
    assert detail.job.status == "completed"
    assert detail.job.summary == {"copied": 1}
    assert detail.items[0].status == "copied"
    assert detail.items[0].destination_instance_id == 9001


def test_run_copy_marks_duplicate_skips_without_failing_job(tmp_path):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
    )
    runner = JobRunner(
        repository,
        FakeDiscogsClient(add_responses=[FakeResponse(422)]),
        FakeKeychainStore(),
    )

    runner._run_copy(detail.job.id)

    detail = repository.get_job_detail(detail.job.id)
    assert detail.job.status == "completed"
    assert detail.job.summary == {"skipped": 1}
    assert detail.items[0].status == "skipped"


def test_run_delete_treats_drift_as_completed_with_issues(tmp_path):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
        workflow_mode="move",
    )
    runner = JobRunner(
        repository,
        FakeDiscogsClient(
            add_responses=[FakeResponse(201, {"instance_id": 9001})],
            delete_responses=[FakeResponse(404)],
        ),
        FakeKeychainStore(),
    )

    runner._run_copy(detail.job.id)
    runner._run_delete(detail.job.id)

    detail = repository.get_job_detail(detail.job.id)
    assert detail.job.status == "completed_with_issues"
    assert detail.job.summary == {"delete_skipped_drift": 1}
    assert detail.items[0].status == "delete_skipped_drift"


def test_run_delete_retries_failed_delete_items(tmp_path):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
        workflow_mode="move",
    )
    runner = JobRunner(
        repository,
        FakeDiscogsClient(
            add_responses=[FakeResponse(201, {"instance_id": 9001})],
            delete_responses=[FakeResponse(500), FakeResponse(204)],
        ),
        FakeKeychainStore(),
    )

    runner._run_copy(detail.job.id)
    runner._run_delete(detail.job.id)
    first_pass = repository.get_job_detail(detail.job.id)
    assert first_pass.job.status == "completed_with_issues"
    assert first_pass.items[0].status == "delete_failed"

    repository.update_job_status(detail.job.id, status="running_delete")
    runner._run_delete(detail.job.id)

    final_detail = repository.get_job_detail(detail.job.id)
    assert final_detail.job.status == "completed"
    assert final_detail.job.summary == {"deleted": 1}
    assert final_detail.items[0].status == "deleted"
    assert final_detail.items[0].attempt_count == 3


def test_rollback_removes_items_waiting_for_delete_confirmation(tmp_path):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
        workflow_mode="move",
    )
    discogs_client = FakeDiscogsClient(
        add_responses=[FakeResponse(201, {"instance_id": 9001})],
        delete_responses=[FakeResponse(204)],
    )
    runner = JobRunner(repository, discogs_client, FakeKeychainStore())

    runner._run_copy(detail.job.id)
    runner.rollback(detail.job.id)

    detail = repository.get_job_detail(detail.job.id)
    assert detail.job.status == "completed_with_issues"
    assert detail.job.summary == {"rolled_back": 1}
    assert detail.items[0].status == "rolled_back"
    assert detail.items[0].attempt_count == 1
    assert len(discogs_client.delete_calls) == 1


def test_resume_only_restarts_supported_job_states(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
    )
    runner = JobRunner(repository, FakeDiscogsClient(), FakeKeychainStore())
    started: list[tuple[str, str]] = []

    monkeypatch.setattr(runner, "start_copy", lambda job_id: started.append(("copy", job_id)))
    monkeypatch.setattr(
        runner,
        "_start_worker",
        lambda job_id, target: started.append((target.__name__, job_id)),
    )

    repository.update_job_status(detail.job.id, status="draft")
    runner.resume(detail.job.id)
    repository.update_job_status(detail.job.id, status="running_copy")
    runner.resume(detail.job.id)
    repository.update_job_status(detail.job.id, status="running_delete")
    runner.resume(detail.job.id)
    repository.update_job_status(detail.job.id, status="completed", finished=True)
    runner.resume(detail.job.id)

    assert started == [
        ("copy", detail.job.id),
        ("copy", detail.job.id),
        ("_run_delete", detail.job.id),
    ]


def test_create_job_route_returns_conflict_when_active_job_exists(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    active_detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_active", account_id=source.id, release_id=101)],
    )
    repository.update_job_status(active_detail.job.id, status="draft")
    source_snapshot = seed_snapshots(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_new", account_id=source.id, release_id=202)],
    )
    job_runner = RecordingJobRunner(repository)
    install_route_dependencies(monkeypatch, repository, job_runner)

    with TestClient(app) as client:
        response = client.post(
            "/jobs",
            json={
                "plan": {
                    "source_account_id": source.id,
                    "destination_account_id": destination.id,
                    "snapshot_id": source_snapshot.id,
                    "workflow_mode": "copy",
                    "name": "Active job test",
                    "filters": {},
                }
            },
        )

    assert response.status_code == 409
    assert response.json()["detail"] == "Only one active job is allowed at a time."
    assert job_runner.started_job_ids == []


def test_create_job_route_returns_conflict_when_preview_has_blocking_conflicts(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    source_snapshot = seed_snapshots(
        repository,
        source=source,
        destination=destination,
        source_items=[
            make_item(
                "item_1",
                account_id=source.id,
                release_id=101,
                custom_field_values={"Condition": "VG+"},
            )
        ],
    )
    job_runner = RecordingJobRunner(repository)
    install_route_dependencies(monkeypatch, repository, job_runner)

    with TestClient(app) as client:
        response = client.post(
            "/jobs",
            json={
                "plan": {
                    "source_account_id": source.id,
                    "destination_account_id": destination.id,
                    "snapshot_id": source_snapshot.id,
                    "workflow_mode": "copy",
                    "name": "Conflict job test",
                    "filters": {},
                }
            },
        )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert any(conflict["type"] == "custom_field_mapping" for conflict in detail["blocking_conflicts"])
    assert job_runner.started_job_ids == []


def test_confirm_delete_route_starts_delete_for_waiting_jobs(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
        workflow_mode="move",
    )
    repository.update_job_status(detail.job.id, status="awaiting_delete_confirmation", started=True)
    job_runner = RecordingJobRunner(repository)
    install_route_dependencies(monkeypatch, repository, job_runner)

    with TestClient(app) as client:
        response = client.post(f"/jobs/{detail.job.id}/confirm-delete")

    assert response.status_code == 200
    assert response.json()["job"]["status"] == "running_delete"
    assert job_runner.confirmed_job_ids == [detail.job.id]


def test_invalid_transition_routes_return_conflict(tmp_path, monkeypatch):
    repository = make_repository(tmp_path)
    source, destination = seed_accounts(repository)
    detail = create_job(
        repository,
        source=source,
        destination=destination,
        source_items=[make_item("item_1", account_id=source.id, release_id=101)],
    )
    job_runner = JobRunner(repository, FakeDiscogsClient(), FakeKeychainStore())
    install_route_dependencies(monkeypatch, repository, job_runner)

    with TestClient(app) as client:
        confirm_delete_response = client.post(f"/jobs/{detail.job.id}/confirm-delete")
        rollback_response = client.post(f"/jobs/{detail.job.id}/rollback")

    assert confirm_delete_response.status_code == 409
    assert rollback_response.status_code == 409
    assert "only allowed" in confirm_delete_response.json()["detail"].lower()
    assert "only allowed" in rollback_response.json()["detail"].lower()
