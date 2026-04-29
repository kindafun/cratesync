import { startTransition, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { deriveLoadedFilterState, type FilterKey } from "../lib/filters";
import { formatJobStatus } from "../lib/format";
import {
  advanceDisplayedSyncProgress,
  type SyncProgressPhase,
  type SyncProgressValue,
} from "../lib/syncProgressDisplay";
import { useAccountConnections } from "./useAccountConnections";
import type {
  AccountRole,
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
  JobDetailResponse,
  JobStatus,
  MigrationJob,
  MigrationPlanPreviewRequest,
  PreviewResponse,
  SaveSelectionPresetRequest,
  SelectionFilters,
  SelectionPreset,
} from "../lib/types";

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  "draft",
  "running_copy",
  "awaiting_delete_confirmation",
  "running_delete",
];
const SYNC_PROGRESS_POLL_MS = 800;
const SYNC_PROGRESS_TICK_MS = 20;
const MAX_SYNC_PROGRESS_WAIT_MS = 5_000;

export interface WorkspaceStateInput {
  setAccounts: (accounts: ConnectedAccount[]) => void;
  setSourceSnapshot: (s: CollectionSnapshot | null) => void;
  setSourceItems: (items: CollectionItemSnapshot[]) => void;
  setDestinationSnapshot: (s: CollectionSnapshot | null) => void;
  setDestinationItems: (items: CollectionItemSnapshot[]) => void;
  sourceAccount?: ConnectedAccount;
  destinationAccount?: ConnectedAccount;
  sourceSnapshot: CollectionSnapshot | null;
  currentPlan: MigrationPlanPreviewRequest;
  currentPlanSignature: string;
  selectedSourceCount: number;
  setSelectedSourceItemIds: (ids: string[]) => void;
  setActiveFilterKeys: (keys: FilterKey[]) => void;
  setSpecificDate: (v: string) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  setArtistQuery: (v: string) => void;
  setTitleQuery: (v: string) => void;
  setSelectedFolderIds: (ids: number[]) => void;
  setSelectedGenres: (v: string[]) => void;
  setSelectedLabels: (v: string[]) => void;
  setSelectedFormats: (v: string[]) => void;
  setSelectedStyles: (v: string[]) => void;
  filters: SelectionFilters;
}

export function useWorkspaceState({
  setAccounts,
  setSourceSnapshot,
  setSourceItems,
  setDestinationSnapshot,
  setDestinationItems,
  sourceAccount,
  destinationAccount,
  sourceSnapshot,
  currentPlan,
  currentPlanSignature,
  selectedSourceCount,
  setSelectedSourceItemIds,
  setActiveFilterKeys,
  setSpecificDate,
  setDateFrom,
  setDateTo,
  setArtistQuery,
  setTitleQuery,
  setSelectedFolderIds,
  setSelectedGenres,
  setSelectedLabels,
  setSelectedFormats,
  setSelectedStyles,
  filters,
}: WorkspaceStateInput) {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [presets, setPresets] = useState<SelectionPreset[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetailResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [status, setStatus] = useState("Connecting to local backend…");
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgressValue | null>(
    null,
  );
  const [syncProgressTarget, setSyncProgressTarget] =
    useState<SyncProgressValue | null>(null);
  const [syncProgressPhase, setSyncProgressPhase] =
    useState<SyncProgressPhase>("running");
  const syncProgressRef = useRef<SyncProgressValue | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [lastPreviewSignature, setLastPreviewSignature] = useState<
    string | null
  >(null);
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);
  const [retryAccountId, setRetryAccountId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [reviewTableMode, setReviewTableMode] = useState<"selected" | "all">(
    "selected",
  );
  const accountConnections = useAccountConnections({
    setStatus,
    refreshWorkspace,
    resetPlanningStateForAccountChange,
  });

  // ── Document title ────────────────────────────────────────────────────────
  useEffect(() => {
    if (jobDetail && ACTIVE_JOB_STATUSES.includes(jobDetail.job.status)) {
      document.title = `${formatJobStatus(jobDetail.job.status)} · ${jobDetail.job.name} · CrateSync`;
    } else if (isSyncing !== null) {
      document.title = "Syncing… · CrateSync";
    } else {
      document.title = "CrateSync";
    }
  }, [jobDetail, isSyncing]);

  // ── Animate sync progress display toward backend checkpoints ─────────────
  useEffect(() => {
    if (
      isSyncing === null ||
      syncProgress === null ||
      syncProgressTarget === null
    ) {
      return;
    }

    if (
      syncProgress.fetched === syncProgressTarget.fetched &&
      syncProgress.total === syncProgressTarget.total
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setSyncProgress((current) =>
        advanceDisplayedSyncProgress(
          current,
          syncProgressTarget,
          syncProgressPhase,
        ),
      );
    }, SYNC_PROGRESS_TICK_MS);

    return () => window.clearInterval(timer);
  }, [isSyncing, syncProgress, syncProgressTarget, syncProgressPhase]);

  useEffect(() => {
    syncProgressRef.current = syncProgress;
  }, [syncProgress]);

  // ── Preset refresh when source account changes ────────────────────────────
  useEffect(() => {
    if (!sourceAccount) {
      setPresets([]);
      setSelectedPresetId("");
      return;
    }
    void refreshPresets(sourceAccount.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceAccount?.id]);

  // ── Load job detail when selection changes ────────────────────────────────
  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null);
      return;
    }
    void loadJobDetail(selectedJobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId]);

  // ── Poll active job ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobDetail || !ACTIVE_JOB_STATUSES.includes(jobDetail.job.status))
      return;
    const timer = window.setInterval(async () => {
      try {
        const [nextDetail, nextJobs] = await Promise.all([
          api.getJob(jobDetail.job.id),
          api.listJobs(),
        ]);
        startTransition(() => {
          setJobDetail(nextDetail);
          setJobs(nextJobs);
        });
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Failed to refresh active job.",
        );
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [jobDetail?.job.id, jobDetail?.job.status]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function refreshWorkspace() {
    setLoading(true);
    setRetryFn(null);
    setRetryAccountId(null);
    try {
      const [health, accountList, jobList] = await Promise.all([
        api.health(),
        api.listAccounts(),
        api.listJobs(),
      ]);

      let nextSourceSnapshot: CollectionSnapshot | null = null;
      let nextSourceItems: CollectionItemSnapshot[] = [];
      let nextDestinationSnapshot: CollectionSnapshot | null = null;
      let nextDestinationItems: CollectionItemSnapshot[] = [];

      for (const account of accountList) {
        if (!account.last_synced_at) continue;
        const snapshotData = await api.listCollectionItems(account.id);
        if (account.role === "source") {
          nextSourceSnapshot = snapshotData.snapshot;
          nextSourceItems = snapshotData.items;
        } else {
          nextDestinationSnapshot = snapshotData.snapshot;
          nextDestinationItems = snapshotData.items;
        }
      }

      startTransition(() => {
        setAccounts(accountList);
        setJobs(jobList);
        setSourceSnapshot(nextSourceSnapshot);
        setSourceItems(nextSourceItems);
        setDestinationSnapshot(nextDestinationSnapshot);
        setDestinationItems(nextDestinationItems);
      });

      setStatus(
        `Backend ${health.status}. ${accountList.length} account link${accountList.length !== 1 ? "s" : ""} present.`,
      );

      const nextSelectedJobId =
        selectedJobId && jobList.some((job) => job.id === selectedJobId)
          ? selectedJobId
          : (jobList[0]?.id ?? null);
      setSelectedJobId(nextSelectedJobId);
      if (!nextSelectedJobId) setJobDetail(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load state.",
      );
      setRetryAccountId(null);
      setRetryFn(() => () => void refreshWorkspace());
    } finally {
      setLoading(false);
    }
  }

  async function refreshPresets(accountId: string) {
    try {
      const nextPresets = await api.listSelectionPresets(accountId);
      setPresets(nextPresets);
      if (
        selectedPresetId &&
        !nextPresets.some((preset) => preset.id === selectedPresetId)
      ) {
        setSelectedPresetId("");
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load presets.",
      );
    }
  }

  async function loadJobDetail(jobId: string) {
    try {
      const detail = await api.getJob(jobId);
      if (detail.job.status === "draft") {
        const resumedDetail = await api.resumeJob(jobId);
        const nextJobs = await api.listJobs();
        startTransition(() => {
          setJobDetail(resumedDetail);
          setJobs(nextJobs);
        });
        setStatus("Recovered draft job and restarted copy phase.");
        return;
      }
      startTransition(() => setJobDetail(detail));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load job detail.",
      );
    }
  }

  function resetPlanningStateForAccountChange(accountId?: string | null) {
    setPreview(null);
    setLastPreviewSignature(null);
    setSelectedSourceItemIds([]);
    if (
      accountId &&
      (jobDetail?.job.source_account_id === accountId ||
        jobDetail?.job.destination_account_id === accountId)
    ) {
      setJobDetail(null);
      setSelectedJobId(null);
    }
  }

  async function handleSync(accountId: string) {
    setRetryFn(null);
    setRetryAccountId(null);
    setIsSyncing(accountId);
    const initialProgress = { fetched: 0, total: null };
    setSyncProgress(initialProgress);
    setSyncProgressTarget(initialProgress);
    setSyncProgressPhase("running");
    try {
      await api.syncCollection(accountId);
      let latestProgress: SyncProgressValue = initialProgress;
      while (true) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, SYNC_PROGRESS_POLL_MS),
        );
        const progress = await api.getSyncProgress(accountId);
        if (progress.status === "error") {
          throw new Error(progress.error ?? "Sync failed.");
        }
        if (progress.status === "running") {
          latestProgress = {
            fetched: progress.fetched ?? 0,
            total: progress.total ?? null,
          };
          setSyncProgressTarget(latestProgress);
        }
        if (progress.status === "done") {
          latestProgress = {
            fetched: progress.fetched ?? latestProgress.fetched,
            total: progress.total ?? latestProgress.total,
          };
          setSyncProgressPhase("finishing");
          setSyncProgressTarget(latestProgress);
          await waitForDisplayedSyncProgress(latestProgress);
          break;
        }
      }
      await refreshWorkspace();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed.");
      setRetryAccountId(accountId);
      setRetryFn(() => () => void handleSync(accountId));
    } finally {
      setIsSyncing(null);
      setSyncProgress(null);
      setSyncProgressTarget(null);
      setSyncProgressPhase("running");
    }
  }

  async function waitForDisplayedSyncProgress(target: SyncProgressValue) {
    const startedAt = Date.now();
    while (true) {
      const current = syncProgressRef.current;
      if (
        current !== null &&
        current.fetched >= target.fetched &&
        current.total === target.total
      ) {
        return;
      }
      if (Date.now() - startedAt >= MAX_SYNC_PROGRESS_WAIT_MS) {
        setSyncProgress(target);
        return;
      }
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, SYNC_PROGRESS_TICK_MS),
      );
    }
  }

  async function handleDisconnect(accountId: string) {
    const role =
      sourceAccount?.id === accountId
        ? "source"
        : destinationAccount?.id === accountId
          ? "destination"
          : null;
    try {
      await api.deleteAccount(accountId);
      resetPlanningStateForAccountChange(accountId);
      if (role) {
        accountConnections.clearConnectPanel(role);
      }
      await refreshWorkspace();
      setStatus("Account disconnected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  async function handlePreview() {
    setRetryFn(null);
    if (!sourceSnapshot || !sourceAccount || !destinationAccount) {
      setStatus("Sync both source and destination snapshots before planning.");
      return;
    }
    if (selectedSourceCount === 0) {
      setStatus("Select at least one release before generating a preview.");
      return;
    }
    setIsGeneratingPreview(true);
    try {
      setStatus("Generating preview…");
      const response = await api.previewPlan(currentPlan);
      setPreview(response);
      setLastPreviewSignature(currentPlanSignature);
      setReviewTableMode("selected");
      setStatus(
        response.blocking_conflicts.length > 0
          ? `Preview generated with ${response.blocking_conflicts.length} blocking conflict${response.blocking_conflicts.length !== 1 ? "s" : ""}.`
          : `Preview generated for ${response.selected_count} selected release${response.selected_count !== 1 ? "s" : ""}.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preview failed.");
      setRetryFn(() => () => void handlePreview());
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  async function handleCreateJob(launchBlocked: boolean) {
    if (launchBlocked || isCreatingJob) return;
    setIsCreatingJob(true);
    try {
      const detail = await api.createJob({ plan: currentPlan });
      setJobDetail(detail);
      setSelectedJobId(detail.job.id);
      setStatus("Job started.");
      const nextJobs = await api.listJobs();
      setJobs(nextJobs);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Job creation failed.",
      );
    } finally {
      setIsCreatingJob(false);
    }
  }

  async function handleConfirmDelete(jobId: string) {
    try {
      const detail = await api.confirmDelete(jobId);
      setJobDetail(detail);
      setStatus("Delete phase started.");
      setJobs(await api.listJobs());
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Delete confirmation failed.",
      );
    }
  }

  async function handleRollback(jobId: string) {
    try {
      const detail = await api.rollback(jobId);
      setJobDetail(detail);
      setStatus("Rollback finished.");
      setJobs(await api.listJobs());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Rollback failed.");
    }
  }

  async function handleExport(jobId: string) {
    try {
      await api.exportJob(jobId);
      setStatus("Reports exported — folder opened in Finder.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed.");
    }
  }

  async function handleClearLocalData() {
    const confirmed = window.confirm(
      "Clear local data, connected-account tokens, saved presets, and job history from this machine?",
    );
    if (!confirmed) return;
    try {
      await api.clearLocalData();
      setPreview(null);
      setLastPreviewSignature(null);
      setJobDetail(null);
      setSelectedJobId(null);
      setSelectedSourceItemIds([]);
      setPresets([]);
      setSelectedPresetId("");
      await refreshWorkspace();
      setStatus(
        "Local cache, job history, and stored connections were cleared.",
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Local data clear failed.",
      );
    }
  }

  async function handleSavePreset() {
    if (!sourceAccount) {
      setStatus("Connect a source account before saving presets.");
      return;
    }
    const trimmedName = presetName.trim();
    if (!trimmedName) {
      setStatus("Give the saved view a name before saving.");
      return;
    }
    const payload: SaveSelectionPresetRequest = {
      name: trimmedName,
      account_id: sourceAccount.id,
      filters,
    };
    try {
      const preset = await api.saveSelectionPreset(payload);
      setPresetName("");
      setSelectedPresetId(preset.id);
      await refreshPresets(sourceAccount.id);
      setStatus(`Saved view "${preset.name}" saved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preset save failed.");
    }
  }

  function applyPreset(preset: SelectionPreset) {
    const loadedState = deriveLoadedFilterState(preset.filters);
    setSelectedPresetId(preset.id);
    setActiveFilterKeys(loadedState.activeFilterKeys);
    setSpecificDate(loadedState.specificDate);
    setDateFrom(loadedState.dateFrom);
    setDateTo(loadedState.dateTo);
    setArtistQuery(loadedState.artistQuery);
    setTitleQuery(loadedState.titleQuery);
    setSelectedFolderIds(preset.filters.folder_ids ?? []);
    setSelectedGenres(preset.filters.genres ?? []);
    setSelectedLabels(preset.filters.labels ?? []);
    setSelectedFormats(preset.filters.formats ?? []);
    setSelectedStyles(preset.filters.styles ?? []);
    setPreview(null);
    setLastPreviewSignature(null);
    setStatus(`Loaded saved view "${preset.name}".`);
  }

  function handlePresetSelection(presetId: string) {
    setSelectedPresetId(presetId);
    const preset = presets.find((entry) => entry.id === presetId);
    if (preset) applyPreset(preset);
  }

  return {
    jobs,
    presets,
    preview,
    jobDetail,
    selectedJobId,
    setSelectedJobId,
    status,
    loading,
    isSyncing,
    syncProgress,
    isGeneratingPreview,
    isCreatingJob,
    lastPreviewSignature,
    retryFn,
    retryAccountId,
    presetName,
    setPresetName,
    selectedPresetId,
    reviewTableMode,
    setReviewTableMode,
    ...accountConnections,
    refreshWorkspace,
    refreshPresets,
    handleSync,
    handleDisconnect,
    handlePreview,
    handleCreateJob,
    handleConfirmDelete,
    handleRollback,
    handleExport,
    handleClearLocalData,
    handleSavePreset,
    applyPreset,
    handlePresetSelection,
  };
}
