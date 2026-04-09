import { Link, MoreHorizontal, RefreshCw } from "lucide-react";

import { formatSyncDateTime } from "../lib/format";
import type { ConnectedAccount } from "../lib/types";

export function SectionAccountControls({
  role,
  account,
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
  syncing?: boolean;
  syncProgress?: { fetched: number; total: number | null } | null;
  errorMessage?: string | null;
  onRetry?: (() => void) | null;
  onConnect(role: "source" | "destination"): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}) {
  const primaryLabel = account ? "Sync" : "Connect";

  let detail = "Not connected";
  if (account) {
    detail = syncing
      ? syncProgress
        ? `Syncing ${syncProgress.fetched.toLocaleString()}${syncProgress.total != null ? ` / ${syncProgress.total.toLocaleString()}` : ""} releases`
        : "Syncing local snapshot…"
      : account.last_synced_at
        ? `Synced ${formatSyncDateTime(account.last_synced_at)}`
        : "Ready to sync";
  }

  return (
    <div className="section-account-toolbar">
      <div className="section-account-head">
        <div className="section-account-meta">
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
                {syncing ? "Syncing…" : primaryLabel}
              </button>
              <details className="section-account-menu">
                <summary aria-label={`Manage ${role} account`}>
                  <MoreHorizontal size={13} />
                  More
                </summary>
                <div className="section-account-menu-panel">
                  <button
                    className="text-btn text-btn-danger"
                    disabled={syncing}
                    onClick={() => onDisconnect(account.id)}
                  >
                    Disconnect
                  </button>
                </div>
              </details>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => onConnect(role)}>
              <Link size={13} />
              {primaryLabel}
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
