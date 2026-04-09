import { useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Bookmark,
  Copy,
  Link,
  Plug,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { FilterKeyBlock } from "./components/FilterKeyBlock";
import { JobConsoleSection } from "./components/JobConsoleSection";
import { ReviewSection } from "./components/ReviewSection";
import { SnapshotSection } from "./components/SnapshotSection";
import { SourceSelectionSection } from "./components/SourceSelectionSection";
import { Field } from "./components/ui";
import { useCollectionSnapshots } from "./hooks/useCollectionSnapshots";
import { useMigrationPlan } from "./hooks/useMigrationPlan";
import { useSelectionFilters } from "./hooks/useSelectionFilters";
import { useWorkspaceState } from "./hooks/useWorkspaceState";
import { formatSyncDateTime } from "./lib/format";
import type {
  CollectionSnapshot,
  ConnectedAccount,
  PreviewResponse,
} from "./lib/types";

export function App() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  const {
    sourceSnapshot,
    setSourceSnapshot,
    sourceItems,
    setSourceItems,
    destinationSnapshot,
    setDestinationSnapshot,
    destinationItems,
    setDestinationItems,
    sourceAccount,
    destinationAccount,
  } = useCollectionSnapshots(accounts);

  const {
    activeFilterKeys,
    setActiveFilterKeys,
    specificDate,
    setSpecificDate,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    artistQuery,
    setArtistQuery,
    titleQuery,
    setTitleQuery,
    selectedFolderIds,
    setSelectedFolderIds,
    selectedGenres,
    setSelectedGenres,
    selectedLabels,
    setSelectedLabels,
    selectedFormats,
    setSelectedFormats,
    selectedStyles,
    setSelectedStyles,
    filters,
    folderOptions,
    genreOptions,
    labelOptions,
    formatOptions,
    styleOptions,
    destinationFolderLookup,
    availableFilterOptions,
    addFilter,
    removeFilter,
  } = useSelectionFilters(sourceItems, destinationItems);

  const {
    workflowMode,
    setWorkflowMode,
    setSelectedSourceItemIds,
    folderMappingOverrides,
    customFieldMappingOverrides,
    currentPlan,
    currentPlanSignature,
    filteredSourceItems,
    selectedSourceIdSet,
    selectedSourceCount,
    toggleSourceSelection,
    selectFilteredItems,
    selectSourceRange,
    deselectFilteredItems,
    clearSelectedItems,
    setFolderOverride,
    setCustomFieldOverride,
  } = useMigrationPlan({
    sourceAccount,
    destinationAccount,
    sourceSnapshot,
    sourceItems,
    filters,
  });

  const {
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
    presetName,
    setPresetName,
    selectedPresetId,
    reviewTableMode,
    setReviewTableMode,
    refreshWorkspace,
    handleConnect,
    handleSync,
    handleDisconnect,
    handlePreview,
    handleCreateJob,
    handleConfirmDelete,
    handleRollback,
    handleExport,
    handleClearLocalData,
    handleSavePreset,
    handlePresetSelection,
  } = useWorkspaceState({
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
  });

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const savedViewsRef = useRef<HTMLDetailsElement>(null);
  const acctMenuRef = useRef<HTMLDetailsElement>(null);
  const handlePreviewRef = useRef(handlePreview);
  handlePreviewRef.current = handlePreview;

  // ── Initial workspace load ────────────────────────────────────────────────
  useEffect(() => {
    void refreshWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        if (savedViewsRef.current?.open) {
          savedViewsRef.current.open = false;
          return;
        }
        if (acctMenuRef.current?.open) {
          acctMenuRef.current.open = false;
          return;
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "g") {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        )
          return;
        event.preventDefault();
        void handlePreviewRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Click-outside to close dropdowns ─────────────────────────────────────
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        acctMenuRef.current?.open &&
        !acctMenuRef.current.contains(e.target as Node)
      )
        acctMenuRef.current.open = false;
      if (
        savedViewsRef.current?.open &&
        !savedViewsRef.current.contains(e.target as Node)
      )
        savedViewsRef.current.open = false;
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ── Derived render values ─────────────────────────────────────────────────
  const previewIsStale = Boolean(
    preview && lastPreviewSignature !== currentPlanSignature,
  );
  const previewSelectedIds = new Set(
    preview?.selected_items.map((item) => item.id) ?? [],
  );
  const duplicateReleaseIds = new Set(preview?.duplicate_release_ids ?? []);
  const recentJobs = jobs.filter((j) => j.status !== "draft").slice(0, 8);
  const previewConflicts = preview?.blocking_conflicts ?? [];
  const folderConflicts = previewConflicts.filter(
    (c) => c.type === "folder_mapping",
  );
  const customFieldConflicts = previewConflicts.filter(
    (c) => c.type === "custom_field_mapping",
  );
  const launchBlocked =
    !preview ||
    previewIsStale ||
    selectedSourceCount === 0 ||
    preview.selected_count === 0 ||
    preview.blocking_conflicts.length > 0 ||
    !sourceAccount ||
    !destinationAccount ||
    !sourceSnapshot;
  const reviewItems =
    reviewTableMode === "selected"
      ? (preview?.selected_items ?? [])
      : sourceItems;
  const reviewState = deriveReviewState({
    preview,
    previewIsStale,
    selectedSourceCount,
    sourceAccount,
    destinationAccount,
    sourceSnapshot,
  });
  const acctTriggerLabel = isSyncing
    ? "Syncing…"
    : !sourceAccount || !destinationAccount
      ? !sourceAccount && !destinationAccount
        ? "Not connected"
        : "Action needed"
      : "2 connected";
  const acctTriggerNeedsAction =
    !isSyncing && (!sourceAccount || !destinationAccount);

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="app-badge">CrateSync · Local v0.1</span>
        <div className="topbar-actions">
          <span className="hero-status">
            <span
              className={`status-dot${loading ? " status-dot-busy" : ""}`}
            />
            {loading
              ? "Refreshing workspace"
              : `Backend online${accounts.length > 0 ? ` · ${accounts.length} account${accounts.length !== 1 ? "s" : ""}` : ""}`}
          </span>
          <div className="toggle-group">
            <button
              className={`toggle-option${workflowMode === "copy" ? " active" : ""}`}
              onClick={() => setWorkflowMode("copy")}
            >
              <Copy size={13} />
              Copy
            </button>
            <button
              className={`toggle-option${workflowMode === "move" ? " active" : ""}`}
              onClick={() => setWorkflowMode("move")}
            >
              <ArrowRightLeft size={13} />
              Move
            </button>
          </div>
          <details className="acct-menu" ref={acctMenuRef}>
            <summary
              aria-label="Account connections"
              className={
                acctTriggerNeedsAction ? "acct-summary--action" : undefined
              }
            >
              <Plug size={13} />
              <span className="acct-trigger-label">
                {isSyncing ? (
                  <>
                    <span
                      className="status-dot status-dot-busy"
                      aria-hidden="true"
                    />
                    Syncing…
                  </>
                ) : (
                  acctTriggerLabel
                )}
              </span>
            </summary>
            <div className="acct-panel">
              {retryFn && (
                <div className="error-banner">
                  <span>{status}</span>
                  <button className="btn btn-ghost btn-sm" onClick={retryFn}>
                    Try again
                  </button>
                </div>
              )}
              <AccountCard
                role="source"
                account={sourceAccount}
                itemCount={sourceSnapshot?.total_items ?? 0}
                syncing={isSyncing === sourceAccount?.id}
                syncProgress={
                  isSyncing === sourceAccount?.id ? syncProgress : null
                }
                onConnect={handleConnect}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
              <hr className="acct-row-divider" />
              <AccountCard
                role="destination"
                account={destinationAccount}
                itemCount={destinationSnapshot?.total_items ?? 0}
                syncing={isSyncing === destinationAccount?.id}
                syncProgress={
                  isSyncing === destinationAccount?.id ? syncProgress : null
                }
                onConnect={handleConnect}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            </div>
          </details>
          <button
            className="text-btn text-btn-danger"
            onClick={() => void handleClearLocalData()}
          >
            <Trash2 size={13} />
            Clear local data
          </button>
        </div>
      </header>

      <section className="shell-grid">
        <section className="shell-content">
          <SourceSelectionSection
            title={`Source selection — ${sourceAccount?.username ?? "Not connected"}`}
            snapshot={sourceSnapshot}
            items={filteredSourceItems}
            totalSourceItems={sourceItems.length}
            selectedCount={selectedSourceCount}
            selectedItemIds={selectedSourceIdSet}
            loading={loading || isSyncing !== null}
            onToggleSelect={toggleSourceSelection}
            onSelectRange={selectSourceRange}
            onSelectAllVisible={selectFilteredItems}
            onDeselectVisible={deselectFilteredItems}
            onClearSelection={clearSelectedItems}
            filterControls={
              <>
                {presets.length > 0 && (
                  <details className="saved-views-menu" ref={savedViewsRef}>
                    <summary>
                      <Bookmark size={13} />
                      Saved views
                    </summary>
                    <div className="saved-views-panel">
                      <Field label="Open saved view">
                        <select
                          value={selectedPresetId}
                          onChange={(event) =>
                            handlePresetSelection(event.target.value)
                          }
                        >
                          <option value="">Select a saved view</option>
                          {presets.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Save current filters">
                        <div className="inline-action">
                          <input
                            type="text"
                            placeholder="Night session split"
                            value={presetName}
                            onChange={(event) =>
                              setPresetName(event.target.value)
                            }
                          />
                          <button
                            className="btn btn-ghost"
                            onClick={() => void handleSavePreset()}
                          >
                            Save
                          </button>
                        </div>
                      </Field>
                    </div>
                  </details>
                )}
                <div className="filter-builder">
                  <div className="filter-list">
                    {activeFilterKeys.map((key) => (
                      <FilterKeyBlock
                        key={key}
                        filterKey={key}
                        onRemove={removeFilter}
                        specificDate={specificDate}
                        setSpecificDate={setSpecificDate}
                        dateFrom={dateFrom}
                        setDateFrom={setDateFrom}
                        dateTo={dateTo}
                        setDateTo={setDateTo}
                        artistQuery={artistQuery}
                        setArtistQuery={setArtistQuery}
                        titleQuery={titleQuery}
                        setTitleQuery={setTitleQuery}
                        genreOptions={genreOptions}
                        selectedGenres={selectedGenres}
                        setSelectedGenres={setSelectedGenres}
                        labelOptions={labelOptions}
                        selectedLabels={selectedLabels}
                        setSelectedLabels={setSelectedLabels}
                        formatOptions={formatOptions}
                        selectedFormats={selectedFormats}
                        setSelectedFormats={setSelectedFormats}
                        styleOptions={styleOptions}
                        selectedStyles={selectedStyles}
                        setSelectedStyles={setSelectedStyles}
                        folderOptions={folderOptions}
                        selectedFolderIds={selectedFolderIds}
                        setSelectedFolderIds={setSelectedFolderIds}
                      />
                    ))}
                  </div>

                  {availableFilterOptions.length > 0 && (
                    <div className="filter-chips">
                      <span className="section-label">Add filter</span>
                      {availableFilterOptions.map((option) => (
                        <button
                          key={option.key}
                          className="filter-chip"
                          onClick={() => addFilter(option.key)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            }
          />

          <SnapshotSection
            title={`Destination reference — ${destinationAccount?.username ?? "Not connected"}`}
            snapshot={destinationSnapshot}
            items={destinationItems}
            loading={loading || isSyncing !== null}
          />

          <ReviewSection
            isGeneratingPreview={isGeneratingPreview}
            onGeneratePreview={() => void handlePreview()}
            isCreatingJob={isCreatingJob}
            launchBlocked={launchBlocked}
            onLaunchJob={() => void handleCreateJob(launchBlocked)}
            reviewState={reviewState}
            selectedSourceCount={selectedSourceCount}
            preview={preview}
            previewSelectedIds={previewSelectedIds}
            duplicateReleaseIds={duplicateReleaseIds}
            folderConflicts={folderConflicts}
            customFieldConflicts={customFieldConflicts}
            destinationFolderLookup={destinationFolderLookup}
            folderMappingOverrides={folderMappingOverrides}
            customFieldMappingOverrides={customFieldMappingOverrides}
            onFolderOverride={setFolderOverride}
            onCustomFieldOverride={setCustomFieldOverride}
            reviewTableMode={reviewTableMode}
            onReviewTableModeChange={setReviewTableMode}
            reviewItems={reviewItems}
            selectedSourceIdSet={selectedSourceIdSet}
          />

          <JobConsoleSection
            recentJobs={recentJobs}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            jobDetail={jobDetail}
            onConfirmDelete={(jobId) => void handleConfirmDelete(jobId)}
            onRollback={(jobId) => void handleRollback(jobId)}
            onExport={(jobId) => void handleExport(jobId)}
          />
        </section>
      </section>
    </main>
  );
}

function AccountCard({
  role,
  account,
  itemCount,
  syncing = false,
  syncProgress = null,
  onConnect,
  onSync,
  onDisconnect,
}: {
  role: "source" | "destination";
  account?: ConnectedAccount;
  itemCount: number;
  syncing?: boolean;
  syncProgress?: { fetched: number; total: number | null } | null;
  onConnect(role: "source" | "destination"): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}) {
  if (!account) {
    return (
      <div className="acct-row">
        <span className={`role-chip role-${role}`}>{role}</span>
        <div className="acct-row-content">
          <span className="acct-row-name acct-row-name--empty">
            Not connected
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onConnect(role)}
          >
            <Link size={13} />
            Connect account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="acct-row">
      <span className={`role-chip role-${role}`}>{role}</span>
      <div className="acct-row-content">
        <span className="acct-row-name">{account.username}</span>
        <span className="acct-row-meta">
          {syncing
            ? syncProgress
              ? `Fetching ${syncProgress.fetched.toLocaleString()} / ${syncProgress.total != null ? syncProgress.total.toLocaleString() : "…"} releases…`
              : "Syncing…"
            : account.last_synced_at
              ? `Synced ${formatSyncDateTime(account.last_synced_at)} · ${itemCount.toLocaleString()} items`
              : "Connected, not yet synced"}
        </span>
        <div className="acct-row-actions">
          <button
            className="btn btn-primary btn-sm"
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
            disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

function deriveReviewState({
  preview,
  previewIsStale,
  selectedSourceCount,
  sourceAccount,
  destinationAccount,
  sourceSnapshot,
}: {
  preview: PreviewResponse | null;
  previewIsStale: boolean;
  selectedSourceCount: number;
  sourceAccount?: ConnectedAccount;
  destinationAccount?: ConnectedAccount;
  sourceSnapshot: CollectionSnapshot | null;
}) {
  if (!sourceAccount || !destinationAccount || !sourceSnapshot) {
    return {
      tone: "default",
      title: "Connect and sync both accounts",
      message:
        "The review step will unlock once both source and destination snapshots are available.",
    } as const;
  }
  if (selectedSourceCount === 0) {
    return {
      tone: "warning",
      title: "Select at least one release",
      message:
        "Use the source table checkboxes or bulk-select all filtered rows before generating a preview.",
    } as const;
  }
  if (!preview) {
    return {
      tone: "default",
      title: "Generate a preview",
      message:
        "Validate duplicates, folder mappings, and destination capabilities before launching the job.",
    } as const;
  }
  if (previewIsStale) {
    return {
      tone: "warning",
      title: "Preview is stale",
      message:
        "Your search, filters, selections, or workflow changed. Generate a fresh preview before launch.",
    } as const;
  }
  if (preview.blocking_conflicts.length > 0) {
    return {
      tone: "warning",
      title: "Resolve blocking issues",
      message: `Clear ${preview.blocking_conflicts.length} conflict${preview.blocking_conflicts.length !== 1 ? "s" : ""} below, then launch the job.`,
    } as const;
  }
  return {
    tone: "ready",
    title: "Ready to launch",
    message:
      "The selected releases have been reviewed. Launch the job when you are satisfied with this preview.",
  } as const;
}
