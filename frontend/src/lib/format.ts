export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function formatJobStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function statusTone(status: string): string {
  if (status.includes("fail")) return "error";
  if (status.includes("skip") || status.includes("awaiting")) return "warning";
  if (status.includes("copied") || status.includes("deleted") || status.includes("rolled")) {
    return "success";
  }
  return "default";
}

export function renderCapabilities(metadata: Record<string, unknown>): string[] {
  return Object.entries(metadata).map(([key, value]) => {
    const normalizedKey = key.replace(/_/g, " ");
    if (typeof value === "boolean") {
      return `${normalizedKey}: ${value ? "yes" : "no"}`;
    }
    return `${normalizedKey}: ${String(value)}`;
  });
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
