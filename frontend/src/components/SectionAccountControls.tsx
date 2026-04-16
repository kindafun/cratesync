import { CircleUserRound, KeyRound, Link, MoreHorizontal, RefreshCw } from "lucide-react";

import { formatSyncDateTime } from "../lib/format";
import type { AccountRole, ConnectedAccount, PendingAuthConnection } from "../lib/types";

export function SectionAccountControls({
  role,
  account,
  syncing = false,
  syncProgress = null,
  errorMessage = null,
  onRetry = null,
  connectionOpen,
  connectionBusy = false,
  connectionToken,
  connectionError = null,
  pendingConnection = null,
  onOpenConnect,
  onCloseConnect,
  onTokenChange,
  onVerifyToken,
  onStartOAuth,
  onConfirmPendingConnection,
  onCancelPendingConnection,
  onSync,
  onDisconnect,
}: {
  role: AccountRole;
  account?: ConnectedAccount;
  syncing?: boolean;
  syncProgress?: { fetched: number; total: number | null } | null;
  errorMessage?: string | null;
  onRetry?: (() => void) | null;
  connectionOpen: boolean;
  connectionBusy?: boolean;
  connectionToken: string;
  connectionError?: string | null;
  pendingConnection?: PendingAuthConnection | null;
  onOpenConnect(role: AccountRole): void;
  onCloseConnect(role: AccountRole): void;
  onTokenChange(role: AccountRole, value: string): void;
  onVerifyToken(role: AccountRole): void;
  onStartOAuth(role: AccountRole): void;
  onConfirmPendingConnection(role: AccountRole): void;
  onCancelPendingConnection(role: AccountRole): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}) {
  const primaryLabel = account ? "Sync" : "Connect";
  const roleLabel = role === "source" ? "From account" : "To account";
  const panelTitle = account ? `Replace ${roleLabel.toLowerCase()}` : `Connect ${roleLabel.toLowerCase()}`;

  const detail = account
    ? syncing
      ? syncProgress
        ? `Syncing ${syncProgress.fetched.toLocaleString()}${syncProgress.total != null ? ` / ${syncProgress.total.toLocaleString()}` : ""} releases`
        : "Syncing local snapshot…"
      : account.last_synced_at
        ? `Synced ${formatSyncDateTime(account.last_synced_at)}`
        : "Ready to sync"
    : null;

  return (
    <div className="section-account-toolbar">
      <div className="section-account-head">
        <div className="section-account-meta">
          <span className="section-account-identity">
            <CircleUserRound className="section-account-icon" size={14} aria-hidden="true" />
            <span className={`section-account-name${account ? "" : " is-empty"}`}>
              {account?.username ?? "Not connected"}
            </span>
          </span>
          {detail && <span className="section-account-status">{detail}</span>}
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
                <summary aria-label={`Manage ${roleLabel}`}>
                  <MoreHorizontal size={13} />
                  More
                </summary>
                <div className="section-account-menu-panel">
                  <button
                    className="text-btn"
                    disabled={syncing || connectionBusy}
                    onClick={() => onOpenConnect(role)}
                  >
                    Replace account
                  </button>
                  <button
                    className="text-btn text-btn-danger"
                    disabled={syncing || connectionBusy}
                    onClick={() => onDisconnect(account.id)}
                  >
                    Disconnect
                  </button>
                </div>
              </details>
            </>
          ) : (
            <button
              className="btn btn-primary"
              disabled={connectionBusy}
              onClick={() => onOpenConnect(role)}
            >
              <Link size={13} />
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
      {connectionOpen && (
        <div className="section-account-connect-panel">
          <div className="section-account-connect-head">
            <div>
              <span className="section-label">{panelTitle}</span>
              <p className="header-note">
                Token login is the fastest path. Browser OAuth stays available as a fallback.
              </p>
            </div>
            <button
              className="text-btn"
              disabled={connectionBusy}
              onClick={() => onCloseConnect(role)}
            >
              Close
            </button>
          </div>

          {pendingConnection ? (
            <div className="section-account-confirm">
              <div className="section-account-confirm-copy">
                <span className="field-label">Verified Discogs account</span>
                <strong>{pendingConnection.username}</strong>
                {pendingConnection.existing_account && (
                  <p className="header-note">
                    Replace {pendingConnection.existing_account.username} as the current {roleLabel.toLowerCase()}.
                  </p>
                )}
              </div>
              <div className="section-account-connect-actions">
                <button
                  className="btn btn-primary"
                  disabled={connectionBusy}
                  onClick={() => onConfirmPendingConnection(role)}
                >
                  {connectionBusy ? "Connecting…" : `Confirm ${roleLabel}`}
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={connectionBusy}
                  onClick={() => onCancelPendingConnection(role)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Discogs user token</span>
                <input
                  type="password"
                  placeholder="Paste token from Discogs settings"
                  value={connectionToken}
                  onChange={(event) => onTokenChange(role, event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className="section-account-connect-actions">
                <button
                  className="btn btn-primary"
                  disabled={connectionBusy}
                  onClick={() => onVerifyToken(role)}
                >
                  <KeyRound size={13} />
                  {connectionBusy ? "Verifying…" : "Verify and connect"}
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={connectionBusy}
                  onClick={() => onStartOAuth(role)}
                >
                  Use browser sign-in instead
                </button>
              </div>
              <p className="header-note">
                Generate a personal access token in{" "}
                <a
                  className="section-account-link"
                  href="https://www.discogs.com/settings/developers"
                  target="_blank"
                  rel="noreferrer"
                >
                  Discogs developer settings
                </a>
                , then paste it here.
              </p>
            </>
          )}

          {connectionError && (
            <div className="error-banner">
              <span>{connectionError}</span>
            </div>
          )}
        </div>
      )}
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
