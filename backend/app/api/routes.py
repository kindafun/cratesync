from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import HTMLResponse

from ..config import settings
from ..database import db, make_id
from ..domain.models import (
    ConnectedAccount,
    DiscogsTokenVerifyRequest,
    ExportResponse,
    MigrationJobCreateRequest,
    MigrationPlanPreviewRequest,
    OAuthStartResponse,
    PendingAuthConnectionRequest,
    PendingAuthConnectionResponse,
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

_sync_progress: dict[str, dict[str, Any]] = {}


@dataclass
class PendingAuthConnection:
    verification_id: str
    role: str
    auth_type: str
    username: str
    discogs_user_id: Optional[int]
    token: str
    token_secret: str = ""
    existing_account_id: Optional[str] = None


_pending_auth_connections: dict[str, PendingAuthConnection] = {}


def _require_discogs_oauth() -> None:
    if not settings.discogs_consumer_key or not settings.discogs_consumer_secret:
        raise HTTPException(status_code=400, detail="Discogs OAuth credentials are not configured.")


def _delete_account_secrets(account: ConnectedAccount) -> None:
    keychain_store.delete_secret(account.token_key)
    if account.token_secret_key:
        keychain_store.delete_secret(account.token_secret_key)


def _pending_response(connection: PendingAuthConnection) -> PendingAuthConnectionResponse:
    existing_account = (
        repository.get_account(connection.existing_account_id)
        if connection.existing_account_id
        else None
    )
    return PendingAuthConnectionResponse(
        verification_id=connection.verification_id,
        role=connection.role,
        auth_type=connection.auth_type,
        username=connection.username,
        discogs_user_id=connection.discogs_user_id,
        requires_replacement_confirmation=existing_account is not None,
        existing_account=existing_account,
    )


def _create_pending_auth_connection(
    *,
    role: str,
    auth_type: str,
    username: str,
    discogs_user_id: Optional[int],
    token: str,
    token_secret: str = "",
) -> PendingAuthConnectionResponse:
    existing_user = repository.find_account_by_username(username)
    if existing_user and existing_user.role != role:
        raise HTTPException(
            status_code=409,
            detail=f"{username} is already connected as the {existing_user.role} account.",
        )

    existing_role = repository.find_account_by_role(role)
    verification_id = make_id("authv")
    pending = PendingAuthConnection(
        verification_id=verification_id,
        role=role,
        auth_type=auth_type,
        username=username,
        discogs_user_id=discogs_user_id,
        token=token,
        token_secret=token_secret,
        existing_account_id=(
            existing_role.id
            if existing_role and existing_role.username != username
            else None
        ),
    )
    _pending_auth_connections[verification_id] = pending
    return _pending_response(pending)


def _finalize_pending_auth_connection(
    verification_id: str,
    *,
    confirm_replace: bool,
) -> ConnectedAccount:
    pending = _pending_auth_connections.get(verification_id)
    if not pending:
        raise HTTPException(status_code=404, detail="Pending account verification not found.")

    existing_role = repository.find_account_by_role(pending.role)
    if existing_role and existing_role.username != pending.username and not confirm_replace:
        raise HTTPException(
            status_code=409,
            detail=f"Confirm replacing the current {pending.role} account before connecting {pending.username}.",
        )

    existing_user = repository.find_account_by_username(pending.username)
    if existing_user and existing_user.role != pending.role:
        raise HTTPException(
            status_code=409,
            detail=f"{pending.username} is already connected as the {existing_user.role} account.",
        )

    replaced_account = (
        existing_role
        if existing_role and existing_role.username != pending.username
        else None
    )
    if replaced_account:
        _delete_account_secrets(replaced_account)
        repository.delete_account(replaced_account.id)

    token_key = (
        f"discogs-user-token-{pending.username}"
        if pending.auth_type == "token"
        else f"discogs-token-{pending.username}"
    )
    token_secret_key = (
        f"discogs-secret-{pending.username}" if pending.auth_type == "oauth" else ""
    )
    keychain_store.set_secret(token_key, pending.token)
    if token_secret_key:
        keychain_store.set_secret(token_secret_key, pending.token_secret)

    previous_account = repository.find_account_by_username(pending.username)
    if previous_account:
        if previous_account.token_key != token_key:
            keychain_store.delete_secret(previous_account.token_key)
        if previous_account.token_secret_key and previous_account.token_secret_key != token_secret_key:
            keychain_store.delete_secret(previous_account.token_secret_key)

    account = repository.upsert_connected_account(
        username=pending.username,
        role=pending.role,
        auth_type=pending.auth_type,
        discogs_user_id=pending.discogs_user_id,
        token_key=token_key,
        token_secret_key=token_secret_key,
    )
    _pending_auth_connections.pop(verification_id, None)
    return account


def _oauth_popup_html(title: str, message: str, payload: Optional[dict[str, Any]] = None) -> HTMLResponse:
    frontend_origin = json.dumps(settings.frontend_origin)
    payload_json = json.dumps(payload) if payload is not None else "null"
    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <style>
      :root {{
        color-scheme: light;
        font-family: system-ui, sans-serif;
      }}

      body {{
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f4f1eb;
        color: #1d1d1d;
      }}

      main {{
        max-width: 28rem;
        padding: 2rem;
        text-align: center;
      }}

      h1 {{
        margin: 0 0 0.75rem;
        font-size: 1.4rem;
      }}

      p {{
        margin: 0;
        line-height: 1.5;
      }}
    </style>
  </head>
  <body>
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
    <script>
      const targetOrigin = {frontend_origin};
      const payload = {payload_json};

      if (payload && window.opener && !window.opener.closed) {{
        window.opener.postMessage(payload, targetOrigin);
        window.close();
      }} else if (!payload && window.opener && !window.opener.closed) {{
        window.close();
      }} else {{
        window.location.replace(targetOrigin);
      }}
    </script>
  </body>
</html>
"""
    return HTMLResponse(content=html)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/auth/discogs/start", response_model=OAuthStartResponse)
def start_discogs_auth(role: str, request: Request) -> OAuthStartResponse:
    _require_discogs_oauth()
    callback = str(request.url_for("finish_discogs_auth"))
    authorization_url, request_token_key, request_token_secret = discogs_client.start_oauth(callback)
    db.save_oauth_request(request_token_key, request_token_secret, role)
    return OAuthStartResponse(
        authorization_url=authorization_url,
        request_token_key=request_token_key,
    )


@router.get("/auth/discogs/callback", response_class=HTMLResponse)
def finish_discogs_auth(oauth_token: str, oauth_verifier: str) -> HTMLResponse:
    _require_discogs_oauth()
    stored = db.consume_oauth_request(oauth_token)
    if not stored:
        raise HTTPException(status_code=404, detail="Missing OAuth request token.")
    access = discogs_client.finish_oauth(
        request_token_key=oauth_token,
        request_token_secret=stored["request_token_secret"],
        oauth_verifier=oauth_verifier,
    )
    try:
        identity = discogs_client.get_identity(
            access["oauth_token"],
            access["oauth_token_secret"],
            auth_type="oauth",
        )
        verification = _create_pending_auth_connection(
            role=stored["role"],
            auth_type="oauth",
            username=identity["username"],
            discogs_user_id=identity.get("id"),
            token=access["oauth_token"],
            token_secret=access["oauth_token_secret"],
        )
    except HTTPException as exc:
        return _oauth_popup_html("Discogs sign-in blocked", str(exc.detail))

    if verification.requires_replacement_confirmation:
        payload = {
            "type": "discogs-auth-verification-ready",
            "verification": verification.model_dump(mode="json"),
        }
        return _oauth_popup_html(
            "Discogs account verified",
            "Return to the app to confirm replacing the current account.",
            payload,
        )

    account = _finalize_pending_auth_connection(
        verification.verification_id,
        confirm_replace=False,
    )
    payload = {
        "type": "discogs-oauth-complete",
        "account": account.model_dump(mode="json"),
    }
    return _oauth_popup_html(
        "Discogs account connected",
        "You can return to the app. This window should close automatically.",
        payload,
    )


@router.post(
    "/auth/discogs/token/verify",
    response_model=PendingAuthConnectionResponse,
)
def verify_discogs_token(request: DiscogsTokenVerifyRequest) -> PendingAuthConnectionResponse:
    user_token = request.user_token.strip()
    if not user_token:
        raise HTTPException(status_code=400, detail="Paste a Discogs user token first.")
    try:
        identity = discogs_client.verify_user_token(user_token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _create_pending_auth_connection(
        role=request.role,
        auth_type="token",
        username=str(identity["username"]),
        discogs_user_id=identity.get("id"),
        token=user_token,
    )


@router.post("/auth/discogs/token/connect", response_model=ConnectedAccount)
def connect_discogs_token(request: PendingAuthConnectionRequest) -> ConnectedAccount:
    return _finalize_pending_auth_connection(
        request.verification_id,
        confirm_replace=request.confirm_replace,
    )


@router.get("/accounts", response_model=list[ConnectedAccount])
def list_accounts() -> list[ConnectedAccount]:
    return repository.list_accounts()


@router.delete("/accounts/{account_id}")
def delete_account(account_id: str) -> dict[str, bool]:
    account = repository.get_account(account_id)
    _delete_account_secrets(account)
    repository.delete_account(account_id)
    return {"ok": True}


def _run_sync(account_id: str) -> None:
    try:
        account = repository.get_account(account_id)
        token = keychain_store.get_secret(account.token_key)
        token_secret = (
            keychain_store.get_secret(account.token_secret_key)
            if account.auth_type == "oauth" and account.token_secret_key
            else None
        )
        latest_fetched = 0
        latest_total: int | None = None

        def on_progress(fetched: int, total: int) -> None:
            nonlocal latest_fetched, latest_total
            latest_fetched = fetched
            latest_total = total
            _sync_progress[account_id] = {"status": "running", "fetched": fetched, "total": total}

        raw_items = discogs_client.paged_collection_items(
            account.username,
            token,
            token_secret,
            auth_type=account.auth_type,
            on_progress=on_progress,
        )
        snapshot_id = "pending"
        items = [
            CollectionNormalizer.from_discogs_payload(account.id, snapshot_id, item)
            for item in raw_items
        ]
        snapshot = repository.replace_snapshot(account.id, account.username, items)
        final_fetched = len(raw_items) if raw_items else latest_fetched
        final_total = latest_total if latest_total is not None else final_fetched
        _sync_progress[account_id] = {
            "status": "done",
            "snapshot_id": snapshot.id,
            "fetched": final_fetched,
            "total": final_total,
        }
    except Exception as exc:
        _sync_progress[account_id] = {"status": "error", "error": str(exc)}


@router.post("/collections/{account_id}/sync")
def sync_collection(account_id: str, background_tasks: BackgroundTasks) -> dict[str, str]:
    _sync_progress[account_id] = {"status": "running", "fetched": 0, "total": None}
    background_tasks.add_task(_run_sync, account_id)
    return {"status": "started"}


@router.get("/collections/{account_id}/sync-progress")
def get_sync_progress(account_id: str) -> dict[str, Any]:
    return _sync_progress.get(account_id, {"status": "idle"})


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
    try:
        job_runner.confirm_delete(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return repository.get_job_detail(job_id)


@router.post("/jobs/{job_id}/rollback")
def rollback_job(job_id: str):
    try:
        job_runner.rollback(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return repository.get_job_detail(job_id)


@router.get("/exports/{job_id}", response_model=ExportResponse)
def export_job(job_id: str) -> ExportResponse:
    csv_path, json_path = export_service.export_job(job_id)
    return ExportResponse(csv_path=str(csv_path), json_path=str(json_path))


@router.delete("/local-data")
def clear_local_data():
    for account in repository.list_accounts():
        _delete_account_secrets(account)
    repository.clear_all_local_data()
    _pending_auth_connections.clear()
    return {"ok": True}
