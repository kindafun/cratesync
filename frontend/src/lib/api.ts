import type {
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
  JobDetailResponse,
  MigrationJob,
  MigrationPlanPreviewRequest,
  PreviewResponse,
  SaveSelectionPresetRequest,
  SelectionPreset,
} from "./types";

const ENV_API_BASE =
  typeof import.meta !== "undefined" ? import.meta.env.VITE_API_BASE?.trim() || "" : "";
const BROWSER_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
const FRONTEND_DEV_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);
const SAME_ORIGIN_API_BASE =
  BROWSER_ORIGIN && !FRONTEND_DEV_ORIGINS.has(BROWSER_ORIGIN) ? BROWSER_ORIGIN : "";
const API_CANDIDATES = Array.from(
  new Set(
    [ENV_API_BASE, SAME_ORIGIN_API_BASE, "http://127.0.0.1:8421", "http://127.0.0.1:8000"].filter(
      (value): value is string => Boolean(value),
    ),
  ),
);

let activeApiBase = API_CANDIDATES[0];

export const API_ORIGINS = Array.from(
  new Set([
    ...API_CANDIDATES.map((value) => new URL(value).origin),
    ...(BROWSER_ORIGIN ? [BROWSER_ORIGIN] : []),
  ]),
);

async function fetchFromBase(path: string, init: RequestInit | undefined, base: string) {
  return fetch(`${base}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response | null = null;
  let lastNetworkError: unknown;

  for (const base of [activeApiBase, ...API_CANDIDATES.filter((value) => value !== activeApiBase)]) {
    try {
      response = await fetchFromBase(path, init, base);
      activeApiBase = base;
      break;
    } catch (error) {
      lastNetworkError = error;
    }
  }

  if (!response) {
    if (lastNetworkError instanceof Error) {
      throw lastNetworkError;
    }
    throw new Error("Could not reach the backend API.");
  }

  if (!response.ok) {
    const text = await response.text();
    let parsedDetail: unknown;
    try {
      parsedDetail = (JSON.parse(text) as { detail?: unknown }).detail;
    } catch {
      parsedDetail = undefined;
    }
    if (typeof parsedDetail === "string") {
      throw new Error(parsedDetail);
    }
    if (parsedDetail !== undefined) {
      throw new Error(JSON.stringify(parsedDetail));
    }
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
    request<{ status: string }>(`/collections/${accountId}/sync`, {
      method: "POST",
    }),
  getSyncProgress: (accountId: string) =>
    request<{ status: string; fetched?: number; total?: number | null; error?: string }>(
      `/collections/${accountId}/sync-progress`,
    ),
  listCollectionItems: (accountId: string, snapshotId?: string) =>
    request<{ snapshot: CollectionSnapshot; items: CollectionItemSnapshot[] }>(
      `/collections/${accountId}/items${snapshotId ? `?snapshot_id=${snapshotId}` : ""}`,
    ),
  listSelectionPresets: (accountId: string) =>
    request<SelectionPreset[]>(`/selection-presets/${accountId}`),
  saveSelectionPreset: (payload: SaveSelectionPresetRequest) =>
    request<SelectionPreset>("/selection-presets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  previewPlan: (payload: MigrationPlanPreviewRequest) =>
    request<PreviewResponse>("/migration-plans/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createJob: (payload: { plan: MigrationPlanPreviewRequest }) =>
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
