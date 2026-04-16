from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


WorkflowMode = Literal["copy", "move"]
AuthType = Literal["oauth", "token"]
JobStatus = Literal[
    "draft",
    "running_copy",
    "awaiting_delete_confirmation",
    "running_delete",
    "completed",
    "completed_with_issues",
    "failed",
    "cancelled",
]
JobItemStatus = Literal[
    "pending",
    "copied",
    "skipped",
    "failed",
    "awaiting_delete_confirmation",
    "deleted",
    "delete_skipped_drift",
    "delete_failed",
    "rolled_back",
]


class ConnectedAccount(BaseModel):
    id: str
    username: str
    role: Literal["source", "destination"]
    auth_type: AuthType = "oauth"
    discogs_user_id: Optional[int] = None
    token_key: str
    token_secret_key: str = ""
    created_at: datetime
    updated_at: datetime
    last_synced_at: Optional[datetime] = None


class CollectionSnapshot(BaseModel):
    id: str
    account_id: str
    username: str
    created_at: datetime
    total_items: int
    stale_after: datetime


class CollectionItemSnapshot(BaseModel):
    id: str
    snapshot_id: str
    account_id: str
    release_id: int
    instance_id: int
    folder_id: int
    folder_name: Optional[str] = None
    date_added: Optional[datetime] = None
    artist: str
    title: str
    year: Optional[int] = None
    labels: list[str] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)
    formats: list[str] = Field(default_factory=list)
    styles: list[str] = Field(default_factory=list)
    rating: Optional[int] = None
    notes: Optional[str] = None
    custom_field_values: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class ConnectedAccountInput(BaseModel):
    role: Literal["source", "destination"]


class OAuthStartResponse(BaseModel):
    authorization_url: str
    request_token_key: str


class AccountLinkRequest(BaseModel):
    role: Literal["source", "destination"]
    oauth_token: str
    oauth_verifier: str


class DiscogsTokenVerifyRequest(BaseModel):
    role: Literal["source", "destination"]
    user_token: str


class PendingAuthConnectionRequest(BaseModel):
    verification_id: str
    confirm_replace: bool = False


class PendingAuthConnectionResponse(BaseModel):
    verification_id: str
    role: Literal["source", "destination"]
    auth_type: AuthType
    username: str
    discogs_user_id: Optional[int] = None
    requires_replacement_confirmation: bool = False
    existing_account: Optional[ConnectedAccount] = None


class SelectionFilters(BaseModel):
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    artist_query: Optional[str] = None
    title_query: Optional[str] = None
    label_query: Optional[str] = None
    genre_query: Optional[str] = None
    format_query: Optional[str] = None
    style_query: Optional[str] = None
    folder_ids: list[int] = Field(default_factory=list)
    genres: list[str] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)
    formats: list[str] = Field(default_factory=list)
    styles: list[str] = Field(default_factory=list)
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    rating_min: Optional[int] = None
    manual_include_snapshot_item_ids: list[str] = Field(default_factory=list)
    manual_exclude_snapshot_item_ids: list[str] = Field(default_factory=list)
    text_query: Optional[str] = None


class MigrationPlanPreviewRequest(BaseModel):
    source_account_id: str
    destination_account_id: str
    snapshot_id: str
    selected_snapshot_item_ids: Optional[list[str]] = None
    workflow_mode: WorkflowMode = "copy"
    name: str = "Untitled plan"
    filters: SelectionFilters = Field(default_factory=SelectionFilters)
    folder_mapping_overrides: dict[str, int] = Field(default_factory=dict)
    custom_field_mapping_overrides: dict[str, str] = Field(default_factory=dict)


class PreviewConflict(BaseModel):
    type: Literal["folder_mapping", "custom_field_mapping", "metadata_loss"]
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)


class PreviewWarning(BaseModel):
    code: str
    message: str


class MigrationPlanPreviewResponse(BaseModel):
    snapshot_id: str
    selected_count: int
    retained_count: int
    duplicate_release_ids: list[int]
    selected_items: list[CollectionItemSnapshot]
    warnings: list[PreviewWarning]
    blocking_conflicts: list[PreviewConflict]
    metadata_capabilities: dict[str, Any]


class SelectionPreset(BaseModel):
    id: str
    name: str
    account_id: str
    filters: SelectionFilters
    created_at: datetime
    updated_at: datetime


class SaveSelectionPresetRequest(BaseModel):
    name: str
    account_id: str
    filters: SelectionFilters


class MigrationJobCreateRequest(BaseModel):
    plan: MigrationPlanPreviewRequest


class MigrationJobItem(BaseModel):
    id: str
    job_id: str
    snapshot_item_id: str
    release_id: int
    instance_id: int
    source_folder_id: int
    destination_folder_id: Optional[int] = None
    status: JobItemStatus
    attempt_count: int = 0
    destination_instance_id: Optional[int] = None
    message: Optional[str] = None
    updated_at: datetime


class JobDetailItem(BaseModel):
    id: str
    job_id: str
    snapshot_item_id: str
    release_id: int
    instance_id: int
    source_folder_id: int
    source_folder_name: Optional[str] = None
    destination_folder_id: Optional[int] = None
    status: JobItemStatus
    attempt_count: int = 0
    destination_instance_id: Optional[int] = None
    message: Optional[str] = None
    updated_at: datetime
    artist: str
    title: str
    year: Optional[int] = None
    date_added: Optional[datetime] = None


class MigrationJob(BaseModel):
    id: str
    name: str
    source_account_id: str
    destination_account_id: str
    snapshot_id: str
    workflow_mode: WorkflowMode
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    summary: dict[str, int] = Field(default_factory=dict)
    blocking_conflicts: list[PreviewConflict] = Field(default_factory=list)
    warnings: list[PreviewWarning] = Field(default_factory=list)
    metadata_capabilities: dict[str, Any] = Field(default_factory=dict)


class JobEvent(BaseModel):
    id: str
    job_id: str
    level: Literal["info", "warning", "error"]
    message: str
    created_at: datetime


class JobDetailResponse(BaseModel):
    job: MigrationJob
    items: list[JobDetailItem]
    events: list[JobEvent]


class ExportResponse(BaseModel):
    csv_path: str
    json_path: str
