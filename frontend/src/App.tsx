import { useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Bookmark,
  Copy,
  Trash2,
} from "lucide-react";

import { FilterKeyBlock } from "./components/FilterKeyBlock";
import { JobConsoleSection } from "./components/JobConsoleSection";
import { ReviewSection } from "./components/ReviewSection";
import { SectionAccountControls } from "./components/SectionAccountControls";
import { SnapshotSection } from "./components/SnapshotSection";
import { SourceSelectionSection } from "./components/SourceSelectionSection";
import { Field } from "./components/ui";
import { deriveReviewState } from "./lib/reviewPresentation";
import { useCollectionSnapshots } from "./hooks/useCollectionSnapshots";
import { useMigrationPlan } from "./hooks/useMigrationPlan";
import { useSelectionFilters } from "./hooks/useSelectionFilters";
import { useWorkspaceState } from "./hooks/useWorkspaceState";
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
    retryAccountId,
    presetName,
    setPresetName,
    selectedPresetId,
    reviewTableMode,
    setReviewTableMode,
    openConnectRole,
    connectBusyRole,
    connectTokenByRole,
    connectErrorByRole,
    pendingConnectionByRole,
    refreshWorkspace,
    openConnectPanel,
    clearConnectPanel,
    updateConnectToken,
    handleVerifyToken,
    handleConfirmPendingConnection,
    handleCancelPendingConnection,
    handleStartOAuth,
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
  const heroStatusLabel = loading ? "Refreshing workspace" : status;
  const workspaceRetry =
    retryFn && retryAccountId === null ? retryFn : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="app-badge">CrateSync · Local v0.1</span>
        <div className="topbar-actions">
          <span className="hero-status">
            <span
              className={`status-dot${loading ? " status-dot-busy" : ""}`}
            />
            {heroStatusLabel}
          </span>
          <div className="toggle-group mode-toggle-group">
            <span className="mode-toggle-option-shell">
              <button
                className={`toggle-option${workflowMode === "copy" ? " active" : ""}`}
                aria-describedby="workflow-mode-copy-tip"
                onClick={() => setWorkflowMode("copy")}
              >
                <Copy size={13} />
                Copy
              </button>
              <span
                className="mode-toggle-tooltip"
                id="workflow-mode-copy-tip"
                role="tooltip"
              >
                Keeps releases in the account you're moving from and adds them to the account you're moving to.
              </span>
            </span>
            <span className="mode-toggle-option-shell">
              <button
                className={`toggle-option${workflowMode === "move" ? " active" : ""}`}
                aria-describedby="workflow-mode-move-tip"
                onClick={() => setWorkflowMode("move")}
              >
                <ArrowRightLeft size={13} />
                Move
              </button>
              <span
                className="mode-toggle-tooltip"
                id="workflow-mode-move-tip"
                role="tooltip"
              >
                Adds releases to the account you're moving to and removes them from the account you're moving from.
              </span>
            </span>
          </div>
          {workspaceRetry && (
            <button className="text-btn" onClick={workspaceRetry}>
              Try again
            </button>
          )}
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
            title="From account"
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
            accountControls={
              <SectionAccountControls
                role="source"
                account={sourceAccount}
                syncing={isSyncing === sourceAccount?.id}
                syncProgress={
                  isSyncing === sourceAccount?.id ? syncProgress : null
                }
                errorMessage={
                  retryAccountId === sourceAccount?.id ? status : null
                }
                onRetry={retryAccountId === sourceAccount?.id ? retryFn : null}
                connectionOpen={openConnectRole === "source"}
                connectionBusy={connectBusyRole === "source"}
                connectionToken={connectTokenByRole.source}
                connectionError={connectErrorByRole.source}
                pendingConnection={pendingConnectionByRole.source}
                onOpenConnect={openConnectPanel}
                onCloseConnect={clearConnectPanel}
                onTokenChange={updateConnectToken}
                onVerifyToken={handleVerifyToken}
                onStartOAuth={handleStartOAuth}
                onConfirmPendingConnection={handleConfirmPendingConnection}
                onCancelPendingConnection={handleCancelPendingConnection}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            }
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
            title="To account"
            snapshot={destinationSnapshot}
            items={destinationItems}
            loading={loading || isSyncing !== null}
            accountControls={
              <SectionAccountControls
                role="destination"
                account={destinationAccount}
                syncing={isSyncing === destinationAccount?.id}
                syncProgress={
                  isSyncing === destinationAccount?.id ? syncProgress : null
                }
                errorMessage={
                  retryAccountId === destinationAccount?.id ? status : null
                }
                onRetry={
                  retryAccountId === destinationAccount?.id ? retryFn : null
                }
                connectionOpen={openConnectRole === "destination"}
                connectionBusy={connectBusyRole === "destination"}
                connectionToken={connectTokenByRole.destination}
                connectionError={connectErrorByRole.destination}
                pendingConnection={pendingConnectionByRole.destination}
                onOpenConnect={openConnectPanel}
                onCloseConnect={clearConnectPanel}
                onTokenChange={updateConnectToken}
                onVerifyToken={handleVerifyToken}
                onStartOAuth={handleStartOAuth}
                onConfirmPendingConnection={handleConfirmPendingConnection}
                onCancelPendingConnection={handleCancelPendingConnection}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            }
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
            previewIsStale={previewIsStale}
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
