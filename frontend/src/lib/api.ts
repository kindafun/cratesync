import type {
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
  JobDetailResponse,
  MigrationJob,
  PreviewResponse,
} from "./types";

const API_BASE = "http://127.0.0.1:8421";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  listAccounts: () => request<ConnectedAccount[]>("/accounts"),
  deleteAccount: (accountId: string) =>
    request<{ ok: boolean }>(`/accounts/${accountId}`, {
      method: "DELETE",
    }),
  startOAuth: (role: "source" | "destination") =>
    request<{ authorization_url: string; request_token_key: string }>(
      `/auth/discogs/start?role=${role}`,
    ),
  syncCollection: (accountId: string) =>
    request<{ snapshot_id: string }>(`/collections/${accountId}/sync`, {
      method: "POST",
    }),
  listCollectionItems: (accountId: string, snapshotId?: string) =>
    request<{ snapshot: CollectionSnapshot; items: CollectionItemSnapshot[] }>(
      `/collections/${accountId}/items${snapshotId ? `?snapshot_id=${snapshotId}` : ""}`,
    ),
  previewPlan: (payload: unknown) =>
    request<PreviewResponse>("/migration-plans/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createJob: (payload: unknown) =>
    request<JobDetailResponse>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listJobs: () => request<MigrationJob[]>("/jobs"),
  getJob: (jobId: string) => request<JobDetailResponse>(`/jobs/${jobId}`),
  confirmDelete: (jobId: string) =>
    request<JobDetailResponse>(`/jobs/${jobId}/confirm-delete`, {
      method: "POST",
    }),
  rollback: (jobId: string) =>
    request<JobDetailResponse>(`/jobs/${jobId}/rollback`, {
      method: "POST",
    }),
  exportJob: (jobId: string) =>
    request<{ csv_path: string; json_path: string }>(`/exports/${jobId}`),
  clearLocalData: () =>
    request<{ ok: boolean }>("/local-data", {
      method: "DELETE",
    }),
};
