export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function formatSyncDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatJobStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function statusTone(status: string): string {
  if (status.includes("fail")) return "error";
  if (status.includes("skip") || status.includes("awaiting")) return "warning";
  if (
    status.includes("copied") ||
    status.includes("deleted") ||
    status.includes("rolled")
  ) {
    return "success";
  }
  return "default";
}

type CapabilityChip = { label: string; value: string; note?: string };

const CAPABILITY_DISPLAY: Record<string, (v: unknown) => CapabilityChip> = {
  supports_date_added_write: () => ({
    label: "Date added",
    value: "not preserved",
    note: "Discogs doesn't allow writing original collection dates — items will show today's date in the destination.",
  }),
  supports_folder_recreation: () => ({
    label: "Folders",
    value: "recreated in destination",
  }),
  custom_fields_best_effort: () => ({
    label: "Custom fields",
    value: "best effort",
    note: "Custom field values are written when the destination has a matching field name.",
  }),
  duplicate_policy: (v) => ({
    label: "Duplicates",
    value: v === "skip_and_log" ? "skipped and logged" : String(v),
  }),
};

export function renderCapabilityChips(
  metadata: Record<string, unknown>,
): CapabilityChip[] {
  return Object.entries(metadata).map(([key, value]) => {
    const fn = CAPABILITY_DISPLAY[key];
    if (fn) return fn(value);
    const label = key.replace(/_/g, " ");
    const val =
      typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
    return { label, value: val };
  });
}

const JOB_ITEM_STATUS_LABELS: Record<string, string> = {
  copied: "Copied",
  skipped: "Skipped",
  failed: "Failed",
  pending: "Pending",
  deleted: "Deleted",
  rolled_back: "Rolled back",
  awaiting_delete_confirmation: "Awaiting delete",
  delete_failed: "Delete failed",
  delete_skipped_drift: "Drift skipped",
};

export function formatJobSummaryLabel(key: string): string {
  return JOB_ITEM_STATUS_LABELS[key] ?? key.replace(/_/g, " ");
}

export function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

export function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

export function startOfDayIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

export function endOfDayIso(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}
