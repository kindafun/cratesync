export interface SyncProgressValue {
  fetched: number;
  total: number | null;
}

export function advanceDisplayedSyncProgress(
  current: SyncProgressValue | null,
  target: SyncProgressValue | null,
): SyncProgressValue | null {
  if (!target) return null;
  if (!current) return target;

  if (target.fetched < current.fetched) {
    return target;
  }

  return {
    fetched:
      target.fetched === current.fetched
        ? current.fetched
        : Math.min(current.fetched + 1, target.fetched),
    total: target.total,
  };
}
