from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from ..config import settings
from ..database import db
from ..domain.models import (
    ConnectedAccount,
    ExportResponse,
    MigrationJobCreateRequest,
    MigrationPlanPreviewRequest,
    OAuthStartResponse,
    SaveSelectionPresetRequest,
)
from ..repository import Repository
from ..services.discogs import discogs_client
from ..services.exports import ExportService
from ..services.jobs import JobRunner
from ..services.keychain import keychain_store
from ..services.planner import MigrationPlanner
from ..services.selection import CollectionNormalizer

router = APIRouter()
repository = Repository(db)
job_runner = JobRunner(repository, discogs_client, keychain_store)
export_service = ExportService(repository)


def _require_discogs_oauth() -> None:
    if not settings.discogs_consumer_key or not settings.discogs_consumer_secret:
        raise HTTPException(status_code=400, detail="Discogs OAuth credentials are not configured.")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/auth/discogs/start", response_model=OAuthStartResponse)
def start_discogs_auth(role: str) -> OAuthStartResponse:
    _require_discogs_oauth()
    callback = f"{settings.backend_origin}/auth/discogs/callback"
    authorization_url, request_token_key, request_token_secret = discogs_client.start_oauth(callback)
    db.save_oauth_request(request_token_key, request_token_secret, role)
    return OAuthStartResponse(
        authorization_url=authorization_url,
        request_token_key=request_token_key,
    )


@router.get("/auth/discogs/callback", response_model=ConnectedAccount)
def finish_discogs_auth(oauth_token: str, oauth_verifier: str) -> ConnectedAccount:
    _require_discogs_oauth()
    stored = db.consume_oauth_request(oauth_token)
    if not stored:
        raise HTTPException(status_code=404, detail="Missing OAuth request token.")
    access = discogs_client.finish_oauth(
        request_token_key=oauth_token,
        request_token_secret=stored["request_token_secret"],
        oauth_verifier=oauth_verifier,
    )
    identity = discogs_client.get_identity(access["oauth_token"], access["oauth_token_secret"])
    token_key = f"discogs-token-{identity['username']}"
    token_secret_key = f"discogs-secret-{identity['username']}"
    keychain_store.set_secret(token_key, access["oauth_token"])
    keychain_store.set_secret(token_secret_key, access["oauth_token_secret"])
    return repository.upsert_connected_account(
        username=identity["username"],
        role=stored["role"],
        discogs_user_id=identity.get("id"),
        token_key=token_key,
        token_secret_key=token_secret_key,
    )


@router.get("/accounts", response_model=list[ConnectedAccount])
def list_accounts() -> list[ConnectedAccount]:
    return repository.list_accounts()


@router.delete("/accounts/{account_id}")
def delete_account(account_id: str) -> dict[str, bool]:
    account = repository.get_account(account_id)
    keychain_store.delete_secret(account.token_key)
    keychain_store.delete_secret(account.token_secret_key)
    repository.delete_account(account_id)
    return {"ok": True}


@router.post("/collections/{account_id}/sync")
def sync_collection(account_id: str) -> dict[str, str]:
    account = repository.get_account(account_id)
    oauth_token = keychain_store.get_secret(account.token_key)
    oauth_secret = keychain_store.get_secret(account.token_secret_key)
    raw_items = discogs_client.paged_collection_items(account.username, oauth_token, oauth_secret)
    snapshot_id = "pending"
    items = [
        CollectionNormalizer.from_discogs_payload(account.id, snapshot_id, item)
        for item in raw_items
    ]
    snapshot = repository.replace_snapshot(account.id, account.username, items)
    return {"snapshot_id": snapshot.id}


@router.get("/collections/{account_id}/items")
def list_collection_items(account_id: str, snapshot_id: Optional[str] = None):
    snapshot = snapshot_id and repository.get_snapshot(snapshot_id) or repository.get_latest_snapshot_for_account(account_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="No snapshot found for account.")
    return {
        "snapshot": snapshot,
        "items": repository.list_snapshot_items(snapshot.id),
    }


@router.get("/selection-presets/{account_id}")
def list_selection_presets(account_id: str):
    return repository.list_presets(account_id)


@router.post("/selection-presets")
def save_selection_preset(request: SaveSelectionPresetRequest):
    return repository.save_preset(request)


@router.post("/migration-plans/preview")
def preview_plan(request: MigrationPlanPreviewRequest):
    source_items = repository.list_snapshot_items(request.snapshot_id)
    destination_snapshot = repository.get_latest_snapshot_for_account(request.destination_account_id)
    destination_items = repository.list_snapshot_items(destination_snapshot.id) if destination_snapshot else []
    response, _ = MigrationPlanner.preview(
        source_items=source_items,
        destination_items=destination_items,
        request=request,
    )
    return response


@router.post("/jobs")
def create_job(request: MigrationJobCreateRequest):
    if repository.active_job_exists():
        raise HTTPException(status_code=409, detail="Only one active job is allowed at a time.")
    source_items = repository.list_snapshot_items(request.plan.snapshot_id)
    destination_snapshot = repository.get_latest_snapshot_for_account(request.plan.destination_account_id)
    destination_items = repository.list_snapshot_items(destination_snapshot.id) if destination_snapshot else []
    preview, destination_folder_ids = MigrationPlanner.preview(
        source_items=source_items,
        destination_items=destination_items,
        request=request.plan,
    )
    if preview.blocking_conflicts:
        raise HTTPException(status_code=409, detail=preview.model_dump(mode="json"))
    job = repository.create_job(
        request.plan,
        blocking_conflicts=preview.blocking_conflicts,
        warnings=preview.warnings,
        metadata_capabilities=preview.metadata_capabilities,
        selected_items=preview.selected_items,
        destination_folder_ids=destination_folder_ids,
    )
    job_runner.start_copy(job.id)
    return repository.get_job_detail(job.id)


@router.get("/jobs")
def list_jobs():
    return repository.list_jobs()


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    return repository.get_job_detail(job_id)


@router.post("/jobs/{job_id}/resume")
def resume_job(job_id: str):
    job_runner.resume(job_id)
    return repository.get_job_detail(job_id)


@router.post("/jobs/{job_id}/confirm-delete")
def confirm_delete(job_id: str):
    job_runner.confirm_delete(job_id)
    return repository.get_job_detail(job_id)


@router.post("/jobs/{job_id}/rollback")
def rollback_job(job_id: str):
    job_runner.rollback(job_id)
    return repository.get_job_detail(job_id)


@router.get("/exports/{job_id}", response_model=ExportResponse)
def export_job(job_id: str) -> ExportResponse:
    csv_path, json_path = export_service.export_job(job_id)
    return ExportResponse(csv_path=str(csv_path), json_path=str(json_path))


@router.delete("/local-data")
def clear_local_data():
    for account in repository.list_accounts():
        keychain_store.delete_secret(account.token_key)
        keychain_store.delete_secret(account.token_secret_key)
    repository.clear_all_local_data()
    return {"ok": True}
