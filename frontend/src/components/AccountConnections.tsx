import type { ConnectedAccount } from "../lib/types";

interface AccountConnectionsProps {
  accounts: ConnectedAccount[];
  loading: boolean;
  onConnect(role: "source" | "destination"): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}

export function AccountConnections({
  accounts,
  loading,
  onConnect,
  onSync,
  onDisconnect,
}: AccountConnectionsProps) {
  const sourceAccount = accounts.find((account) => account.role === "source");
  const destinationAccount = accounts.find((account) => account.role === "destination");

  return (
    <section className="panel panel-full">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Accounts</p>
          <h2>OAuth docking bay</h2>
        </div>
      </div>
      <div className="account-slots">
        <ConnectionSlot
          role="source"
          account={sourceAccount}
          onConnect={onConnect}
          onSync={onSync}
          onDisconnect={onDisconnect}
        />
        <div className="account-slot-divider">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <ConnectionSlot
          role="destination"
          account={destinationAccount}
          onConnect={onConnect}
          onSync={onSync}
          onDisconnect={onDisconnect}
        />
      </div>
      {loading && <p className="loading-line">Refreshing account state…</p>}
    </section>
  );
}

interface ConnectionSlotProps {
  role: "source" | "destination";
  account?: ConnectedAccount;
  onConnect(role: "source" | "destination"): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}

function ConnectionSlot({ role, account, onConnect, onSync, onDisconnect }: ConnectionSlotProps) {
  if (!account) {
    return (
      <article className="account-card account-card-empty">
        <span className={`role-badge role-${role}`}>{role}</span>
        <p style={{ color: "var(--muted)", fontSize: "0.83rem", margin: "0.1rem 0" }}>
          Authorize the {role} Discogs account to begin.
        </p>
        <button className="btn btn-primary btn-sm" onClick={() => onConnect(role)}>
          Connect account
        </button>
      </article>
    );
  }

  return (
    <article className="account-card">
      <span className={`role-badge role-${account.role}`}>{account.role}</span>
      <p className="account-name">{account.username}</p>
      <div className="account-meta-row">
        <span>Connected</span>
        <span>
          {account.last_synced_at
            ? `Synced ${new Date(account.last_synced_at).toLocaleString()}`
            : "Not yet synced"}
        </span>
      </div>
      <div className="btn-row">
        <button className="btn btn-primary btn-sm" onClick={() => onSync(account.id)}>
          Sync collection
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onDisconnect(account.id)}>
          Disconnect
        </button>
      </div>
    </article>
  );
}
