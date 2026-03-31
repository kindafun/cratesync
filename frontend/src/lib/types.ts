export type AccountRole = "source" | "destination";

export interface ConnectedAccount {
  id: string;
  username: string;
  role: AccountRole;
  discogs_user_id?: number | null;
  created_at: string;
  updated_at: string;
  last_synced_at?: string | null;
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
  rating?: number | null;
  notes?: string | null;
  custom_field_values: Record<string, unknown>;
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
  workflow_mode: "copy" | "move";
  status: string;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  summary: JobSummary;
}

export interface MigrationJobItem {
  id: string;
  job_id: string;
  snapshot_item_id: string;
  release_id: number;
  instance_id: number;
  source_folder_id: number;
  destination_folder_id?: number | null;
  status: string;
  attempt_count: number;
  destination_instance_id?: number | null;
  message?: string | null;
  updated_at: string;
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
  items: MigrationJobItem[];
  events: JobEvent[];
}

