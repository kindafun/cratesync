export type AccountRole = "source" | "destination";
export type AuthType = "oauth" | "token";
export type WorkflowMode = "copy" | "move";
export type JobStatus =
  | "draft"
  | "running_copy"
  | "awaiting_delete_confirmation"
  | "running_delete"
  | "completed"
  | "completed_with_issues"
  | "failed"
  | "cancelled";

export interface ConnectedAccount {
  id: string;
  username: string;
  role: AccountRole;
  auth_type: AuthType;
  discogs_user_id?: number | null;
  created_at: string;
  updated_at: string;
  last_synced_at?: string | null;
}

export interface PendingAuthConnection {
  verification_id: string;
  role: AccountRole;
  auth_type: AuthType;
  username: string;
  discogs_user_id?: number | null;
  requires_replacement_confirmation: boolean;
  existing_account?: ConnectedAccount | null;
}

export interface CollectionSnapshot {
  id: string;
  account_id: string;
  username: string;
  created_at: string;
  total_items: number;
  stale_after: string;
}

export interface CollectionItemSnapshot {
  id: string;
  snapshot_id: string;
  account_id: string;
  release_id: number;
  instance_id: number;
  folder_id: number;
  folder_name?: string | null;
  date_added?: string | null;
  artist: string;
  title: string;
  year?: number | null;
  labels: string[];
  genres: string[];
  formats: string[];
  styles: string[];
  rating?: number | null;
  notes?: string | null;
  custom_field_values: Record<string, unknown>;
}

export interface SelectionFilters {
  date_from?: string | null;
  date_to?: string | null;
  artist_query?: string | null;
  title_query?: string | null;
  label_query?: string | null;
  genre_query?: string | null;
  format_query?: string | null;
  style_query?: string | null;
  folder_ids: number[];
  genres: string[];
  labels: string[];
  formats: string[];
  styles: string[];
  year_min?: number | null;
  year_max?: number | null;
  rating_min?: number | null;
  manual_include_snapshot_item_ids: string[];
  manual_exclude_snapshot_item_ids: string[];
  text_query?: string | null;
}

export interface MigrationPlanPreviewRequest {
  source_account_id: string;
  destination_account_id: string;
  snapshot_id: string;
  selected_snapshot_item_ids?: string[] | null;
  workflow_mode: WorkflowMode;
  name: string;
  filters: SelectionFilters;
  folder_mapping_overrides: Record<string, number>;
  custom_field_mapping_overrides: Record<string, string>;
}

export interface PreviewWarning {
  code: string;
  message: string;
}

export interface PreviewConflict {
  type: "folder_mapping" | "custom_field_mapping" | "metadata_loss";
  message: string;
  payload: Record<string, unknown>;
}

export interface PreviewResponse {
  snapshot_id: string;
  selected_count: number;
  retained_count: number;
  duplicate_release_ids: number[];
  selected_items: CollectionItemSnapshot[];
  warnings: PreviewWarning[];
  blocking_conflicts: PreviewConflict[];
  metadata_capabilities: Record<string, unknown>;
}

export interface JobSummary {
  [key: string]: number;
}

export interface MigrationJob {
  id: string;
  name: string;
  source_account_id: string;
  destination_account_id: string;
  snapshot_id: string;
  workflow_mode: WorkflowMode;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  summary: JobSummary;
}

export interface JobDetailItem {
  id: string;
  job_id: string;
  snapshot_item_id: string;
  release_id: number;
  instance_id: number;
  source_folder_id: number;
  source_folder_name?: string | null;
  destination_folder_id?: number | null;
  status: string;
  attempt_count: number;
  destination_instance_id?: number | null;
  message?: string | null;
  updated_at: string;
  artist: string;
  title: string;
  year?: number | null;
  date_added?: string | null;
}

export interface JobEvent {
  id: string;
  job_id: string;
  level: "info" | "warning" | "error";
  message: string;
  created_at: string;
}

export interface JobDetailResponse {
  job: MigrationJob;
  items: JobDetailItem[];
  events: JobEvent[];
}

export interface SelectionPreset {
  id: string;
  name: string;
  account_id: string;
  filters: SelectionFilters;
  created_at: string;
  updated_at: string;
}

export interface SaveSelectionPresetRequest {
  name: string;
  account_id: string;
  filters: SelectionFilters;
}

export type ReviewTone = "default" | "warning" | "ready";
export type ReviewChecklistStatus = "done" | "attention" | "blocked";

export interface ReviewChecklistItem {
  label: string;
  status: ReviewChecklistStatus;
}

export interface ReviewState {
  tone: ReviewTone;
  title: string;
  message: string;
  blockerCount: number;
  checklist: ReviewChecklistItem[];
}
