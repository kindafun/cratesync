import { Link, RefreshCw } from "lucide-react";

import { formatSyncDateTime } from "../lib/format";
import type { ConnectedAccount } from "../lib/types";

export function SectionAccountControls({
  role,
  account,
  itemCount,
  syncing = false,
  syncProgress = null,
  errorMessage = null,
  onRetry = null,
  onConnect,
  onSync,
  onDisconnect,
}: {
  role: "source" | "destination";
  account?: ConnectedAccount;
  itemCount: number;
  syncing?: boolean;
  syncProgress?: { fetched: number; total: number | null } | null;
  errorMessage?: string | null;
  onRetry?: (() => void) | null;
  onConnect(role: "source" | "destination"): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}) {
  const accountLabel =
    role === "source" ? "Source account" : "Destination account";

  let detail = "Discogs account not connected.";
  if (account) {
    detail = syncing
      ? syncProgress
        ? `Fetching ${syncProgress.fetched.toLocaleString()} / ${syncProgress.total != null ? syncProgress.total.toLocaleString() : "…"} releases…`
        : "Syncing local snapshot…"
      : account.last_synced_at
        ? `Synced ${formatSyncDateTime(account.last_synced_at)} · ${itemCount.toLocaleString()} items`
        : "Connected, not yet synced.";
  }

  return (
    <div className="section-account-toolbar">
      <div className="section-account-head">
        <div className="section-account-meta">
          <span className="section-label">{accountLabel}</span>
          <span className={`section-account-name${account ? "" : " is-empty"}`}>
            {account?.username ?? "Not connected"}
          </span>
          <span className="section-account-status">{detail}</span>
        </div>
        <div className="section-account-actions">
          {account ? (
            <>
              <button
                className="btn btn-primary"
                disabled={syncing}
                onClick={() => onSync(account.id)}
              >
                <RefreshCw size={13} />
                {syncing ? "Syncing…" : "Sync"}
              </button>
              <button
                className="text-btn"
                disabled={syncing}
                onClick={() => onDisconnect(account.id)}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => onConnect(role)}>
              <Link size={13} />
              {role === "source" ? "Connect source" : "Connect destination"}
            </button>
          )}
        </div>
      </div>
      {onRetry && errorMessage && (
        <div className="error-banner">
          <span>{errorMessage}</span>
          <button className="btn btn-ghost btn-sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
