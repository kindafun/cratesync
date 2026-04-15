export interface SyncProgressValue {
  fetched: number;
  total: number | null;
}

export type SyncProgressPhase = "running" | "finishing";

const FINAL_CATCH_UP_TICKS = 20;

export function advanceDisplayedSyncProgress(
  current: SyncProgressValue | null,
  target: SyncProgressValue | null,
  phase: SyncProgressPhase = "running",
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
        : Math.min(
            current.fetched +
              (phase === "finishing"
                ? Math.max(
                    1,
                    Math.ceil((target.fetched - current.fetched) / FINAL_CATCH_UP_TICKS),
                  )
                : 1),
            target.fetched,
          ),
    total: target.total,
  };
}
