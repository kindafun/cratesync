import { useEffect, useState } from "react";

import { AccountConnections } from "./components/AccountConnections";
import { JobConsole } from "./components/JobConsole";
import { PlannerPanel } from "./components/PlannerPanel";
import { SnapshotExplorer } from "./components/SnapshotExplorer";
import { api } from "./lib/api";
import type {
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
  JobDetailResponse,
  PreviewResponse,
} from "./lib/types";

export function App() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetailResponse | null>(null);
  const [sourceSnapshot, setSourceSnapshot] = useState<CollectionSnapshot | null>(null);
  const [sourceItems, setSourceItems] = useState<CollectionItemSnapshot[]>([]);
  const [destinationSnapshot, setDestinationSnapshot] = useState<CollectionSnapshot | null>(null);
  const [destinationItems, setDestinationItems] = useState<CollectionItemSnapshot[]>([]);
  const [status, setStatus] = useState("Connecting to local backend…");
  const [loading, setLoading] = useState(false);

  async function refreshAccounts() {
    setLoading(true);
    try {
      const [health, accountList] = await Promise.all([api.health(), api.listAccounts()]);
      setAccounts(accountList);
      setStatus(`Backend ${health.status}. ${accountList.length} account link${accountList.length !== 1 ? "s" : ""} present.`);
      for (const account of accountList) {
        if (account.last_synced_at) {
          const snapshotData = await api.listCollectionItems(account.id);
          if (account.role === "source") {
            setSourceSnapshot(snapshotData.snapshot);
            setSourceItems(snapshotData.items);
          } else {
            setDestinationSnapshot(snapshotData.snapshot);
            setDestinationItems(snapshotData.items);
          }
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load state.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAccounts();
  }, []);

  useEffect(() => {
    if (!jobDetail) return;
    if (!["running_copy", "running_delete", "awaiting_delete_confirmation"].includes(jobDetail.job.status)) return;
    const timer = window.setInterval(async () => {
      const next = await api.getJob(jobDetail.job.id);
      setJobDetail(next);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [jobDetail]);

  async function handleConnect(role: "source" | "destination") {
    try {
      const response = await api.startOAuth(role);
      window.open(response.authorization_url, "_blank", "width=960,height=720");
      setStatus(`OAuth started for ${role}. Finish the callback flow in the opened window.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "OAuth start failed.");
    }
  }

  async function handleSync(accountId: string) {
    try {
      setStatus("Syncing collection snapshot from Discogs…");
      await api.syncCollection(accountId);
      await refreshAccounts();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed.");
    }
  }

  async function handleDisconnect(accountId: string) {
    try {
      await api.deleteAccount(accountId);
      if (jobDetail?.job.source_account_id === accountId || jobDetail?.job.destination_account_id === accountId) {
        setJobDetail(null);
      }
      setPreview(null);
      await refreshAccounts();
      setStatus("Account disconnected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  async function handlePreview(payload: Record<string, unknown>) {
    const source = accounts.find((account) => account.role === "source");
    const destination = accounts.find((account) => account.role === "destination");
    if (!sourceSnapshot || !source || !destination) {
      setStatus("Sync both source and destination snapshots before planning.");
      return;
    }
    const nextPayload = {
      ...payload,
      source_account_id: source.id,
      destination_account_id: destination.id,
      snapshot_id: sourceSnapshot.id,
    };
    const response = await api.previewPlan(nextPayload);
    setPreview(response);
    setStatus(`Preview generated for ${response.selected_count} collection items.`);
  }

  async function handleCreateJob(payload: Record<string, unknown>) {
    const source = accounts.find((account) => account.role === "source");
    const destination = accounts.find((account) => account.role === "destination");
    if (!sourceSnapshot || !source || !destination) {
      setStatus("Sync both source and destination snapshots before starting a job.");
      return;
    }
    const detail = await api.createJob({
      plan: {
        ...payload,
        source_account_id: source.id,
        destination_account_id: destination.id,
        snapshot_id: sourceSnapshot.id,
      },
    });
    setJobDetail(detail);
    setStatus(`Job ${detail.job.id} created.`);
  }

  async function handleConfirmDelete(jobId: string) {
    const detail = await api.confirmDelete(jobId);
    setJobDetail(detail);
    setStatus("Delete phase started.");
  }

  async function handleRollback(jobId: string) {
    const detail = await api.rollback(jobId);
    setJobDetail(detail);
    setStatus("Rollback finished.");
  }

  async function handleExport(jobId: string) {
    const result = await api.exportJob(jobId);
    setStatus(`Reports written to ${result.csv_path} and ${result.json_path}.`);
  }

  async function handleClearLocalData() {
    await api.clearLocalData();
    setPreview(null);
    setJobDetail(null);
    setSourceSnapshot(null);
    setSourceItems([]);
    setDestinationSnapshot(null);
    setDestinationItems([]);
    await refreshAccounts();
    setStatus("Local cache, job history, and stored connections were cleared.");
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-top">
          <p className="eyebrow">Discogs Migration · Local v0.1</p>
          <button className="text-btn" onClick={() => void handleClearLocalData()}>
            Clear local data
          </button>
        </div>
        <h1>
          Collection split<br />
          <em>control room</em>
        </h1>
        <p className="hero-copy">
          Sync both accounts locally, compose an instance-level migration set, then
          run copy or move jobs with audit trails and recovery points.
        </p>
        <div className="status-bar">
          <span className="status-dot" style={{ background: loading ? "var(--amber)" : "var(--green)" }} />
          <span>{status}</span>
        </div>
      </header>

      <section className="dashboard-grid">
        <AccountConnections
          accounts={accounts}
          loading={loading}
          onConnect={(role) => void handleConnect(role)}
          onSync={(accountId) => void handleSync(accountId)}
          onDisconnect={(accountId) => void handleDisconnect(accountId)}
        />
        <SnapshotExplorer title="Source" snapshot={sourceSnapshot} items={sourceItems} />
        <SnapshotExplorer title="Destination" snapshot={destinationSnapshot} items={destinationItems} />
        <PlannerPanel
          accounts={accounts}
          preview={preview}
          onPreview={(payload) => handlePreview(payload)}
          onCreateJob={(payload) => handleCreateJob(payload)}
        />
        <JobConsole
          detail={jobDetail}
          onConfirmDelete={(jobId) => void handleConfirmDelete(jobId)}
          onRollback={(jobId) => void handleRollback(jobId)}
          onExport={(jobId) => void handleExport(jobId)}
        />
      </section>
    </main>
  );
}
