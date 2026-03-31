import { startTransition, useEffect, useState, type ReactNode } from "react";

import { API_ORIGINS, api } from "./lib/api";
import type {
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
  JobDetailResponse,
  JobStatus,
  MigrationJob,
  MigrationPlanPreviewRequest,
  PreviewConflict,
  PreviewResponse,
  SaveSelectionPresetRequest,
  SelectionFilters,
  SelectionPreset,
  WorkflowMode,
} from "./lib/types";

const ACTIVE_JOB_STATUSES: JobStatus[] = [
  "running_copy",
  "awaiting_delete_confirmation",
  "running_delete",
];

type OAuthCompleteMessage = {
  type: "discogs-oauth-complete";
  account?: ConnectedAccount;
};

type SnapshotPageSize = 50 | 100 | 250;
type SnapshotSortColumn = "artist" | "title" | "year" | "folder" | "genre" | "label" | "added";
type SnapshotSortDirection = "asc" | "desc";

function renderOAuthPopup(popup: Window, title: string, message: string, details?: string) {
  const detailMarkup = details
    ? `<pre style="margin: 1rem 0 0; padding: 0.75rem; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap; word-break: break-word; text-align: left;">${escapeHtml(
        details,
      )}</pre>`
    : "";

  popup.document.title = title;
  popup.document.body.innerHTML = `
    <main style="max-width: 42rem; margin: 0 auto; padding: 24px; font-family: system-ui, sans-serif; color: #1d1d1d;">
      <h1 style="margin: 0 0 12px; font-size: 1.25rem;">${escapeHtml(title)}</h1>
      <p style="margin: 0; line-height: 1.5;">${escapeHtml(message)}</p>
      ${detailMarkup}
    </main>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const EMPTY_FILTERS: SelectionFilters = {
  date_from: null,
  date_to: null,
  folder_ids: [],
  genres: [],
  labels: [],
  formats: [],
  year_min: null,
  year_max: null,
  rating_min: null,
  manual_include_snapshot_item_ids: [],
  manual_exclude_snapshot_item_ids: [],
  text_query: null,
};

export function App() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [presets, setPresets] = useState<SelectionPreset[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetailResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [sourceSnapshot, setSourceSnapshot] = useState<CollectionSnapshot | null>(null);
  const [sourceItems, setSourceItems] = useState<CollectionItemSnapshot[]>([]);
  const [destinationSnapshot, setDestinationSnapshot] = useState<CollectionSnapshot | null>(null);
  const [destinationItems, setDestinationItems] = useState<CollectionItemSnapshot[]>([]);
  const [status, setStatus] = useState("Connecting to local backend…");
  const [loading, setLoading] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [lastPreviewSignature, setLastPreviewSignature] = useState<string | null>(null);

  const [planName, setPlanName] = useState("Digital archive split");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("copy");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [textQuery, setTextQuery] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [manualIncludeIds, setManualIncludeIds] = useState<string[]>([]);
  const [manualExcludeIds, setManualExcludeIds] = useState<string[]>([]);
  const [folderMappingOverrides, setFolderMappingOverrides] = useState<Record<string, number>>({});
  const [customFieldMappingOverrides, setCustomFieldMappingOverrides] = useState<Record<string, string>>({});

  const sourceAccount = accounts.find((account) => account.role === "source");
  const destinationAccount = accounts.find((account) => account.role === "destination");

  const filters = buildFilters({
    dateFrom,
    dateTo,
    textQuery,
    yearMin,
    yearMax,
    ratingMin,
    selectedFolderIds,
    selectedGenres,
    selectedLabels,
    selectedFormats,
    manualIncludeIds,
    manualExcludeIds,
  });

  const currentPlan: MigrationPlanPreviewRequest = {
    source_account_id: sourceAccount?.id ?? "",
    destination_account_id: destinationAccount?.id ?? "",
    snapshot_id: sourceSnapshot?.id ?? "",
    workflow_mode: workflowMode,
    name: planName.trim() || "Untitled plan",
    filters,
    folder_mapping_overrides: folderMappingOverrides,
    custom_field_mapping_overrides: sanitizeStringMap(customFieldMappingOverrides),
  };
  const currentPlanSignature = JSON.stringify(currentPlan);
  const previewIsStale = Boolean(preview && lastPreviewSignature !== currentPlanSignature);

  const previewSelectedIds = new Set(preview?.selected_items.map((item) => item.id) ?? []);
  const duplicateReleaseIds = new Set(preview?.duplicate_release_ids ?? []);
  const launchBlocked =
    !preview ||
    previewIsStale ||
    preview.selected_count === 0 ||
    preview.blocking_conflicts.length > 0 ||
    !sourceAccount ||
    !destinationAccount ||
    !sourceSnapshot;

  const folderOptions = deriveFolderOptions(sourceItems);
  const genreOptions = deriveStringOptions(sourceItems, "genres");
  const labelOptions = deriveStringOptions(sourceItems, "labels");
  const formatOptions = deriveStringOptions(sourceItems, "formats");
  const destinationFolderLookup = deriveFolderLookup(destinationItems);
  const recentJobs = jobs.slice(0, 8);
  const previewConflicts = preview?.blocking_conflicts ?? [];
  const folderConflicts = previewConflicts.filter((conflict) => conflict.type === "folder_mapping");
  const customFieldConflicts = previewConflicts.filter(
    (conflict) => conflict.type === "custom_field_mapping",
  );

  async function refreshWorkspace() {
    setLoading(true);
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
          : jobList[0]?.id ?? null;
      setSelectedJobId(nextSelectedJobId);
      if (!nextSelectedJobId) {
        setJobDetail(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load state.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshPresets(accountId: string) {
    try {
      const nextPresets = await api.listSelectionPresets(accountId);
      setPresets(nextPresets);
      if (selectedPresetId && !nextPresets.some((preset) => preset.id === selectedPresetId)) {
        setSelectedPresetId("");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load presets.");
    }
  }

  async function loadJobDetail(jobId: string) {
    try {
      const detail = await api.getJob(jobId);
      startTransition(() => {
        setJobDetail(detail);
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load job detail.");
    }
  }

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  useEffect(() => {
    function handleOAuthMessage(event: MessageEvent<OAuthCompleteMessage>) {
      if (!API_ORIGINS.includes(event.origin)) return;
      if (event.data?.type !== "discogs-oauth-complete") return;

      const role = event.data.account?.role;
      void refreshWorkspace();
      setStatus(
        role
          ? `${role[0].toUpperCase()}${role.slice(1)} account connected.`
          : "Discogs account connected.",
      );
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!sourceAccount) {
      setPresets([]);
      setSelectedPresetId("");
      return;
    }
    void refreshPresets(sourceAccount.id);
  }, [sourceAccount?.id]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null);
      return;
    }
    void loadJobDetail(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!jobDetail || !ACTIVE_JOB_STATUSES.includes(jobDetail.job.status)) return;
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
        setStatus(error instanceof Error ? error.message : "Failed to refresh active job.");
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [jobDetail?.job.id, jobDetail?.job.status]);

  async function handleConnect(role: "source" | "destination") {
    const popup = window.open("", `discogs-oauth-${role}`, "popup=yes,width=960,height=720");
    if (!popup) {
      setStatus("Popup blocked. Allow popups for this app and try again.");
      return;
    }

    renderOAuthPopup(
      popup,
      "Connecting to Discogs",
      "Starting Discogs OAuth. This window will redirect when the backend responds.",
    );

    try {
      const response = await api.startOAuth(role);
      popup.location.replace(response.authorization_url);
      setStatus(`OAuth started for ${role}. Finish the callback flow in the opened window.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "OAuth start failed.";
      renderOAuthPopup(
        popup,
        "Could not start Discogs OAuth",
        "The app could not begin the account connection flow.",
        message,
      );
      setStatus(message);
    }
  }

  async function handleSync(accountId: string) {
    try {
      setStatus("Syncing collection snapshot from Discogs…");
      await api.syncCollection(accountId);
      await refreshWorkspace();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed.");
    }
  }

  async function handleDisconnect(accountId: string) {
    try {
      await api.deleteAccount(accountId);
      setPreview(null);
      setLastPreviewSignature(null);
      if (
        jobDetail?.job.source_account_id === accountId ||
        jobDetail?.job.destination_account_id === accountId
      ) {
        setJobDetail(null);
        setSelectedJobId(null);
      }
      await refreshWorkspace();
      setStatus("Account disconnected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  async function handlePreview() {
    if (!sourceSnapshot || !sourceAccount || !destinationAccount) {
      setStatus("Sync both source and destination snapshots before planning.");
      return;
    }
    try {
      setStatus("Generating preview…");
      const response = await api.previewPlan(currentPlan);
      setPreview(response);
      setLastPreviewSignature(currentPlanSignature);
      setStatus(
        response.blocking_conflicts.length > 0
          ? `Preview generated with ${response.blocking_conflicts.length} blocking conflict${response.blocking_conflicts.length !== 1 ? "s" : ""}.`
          : `Preview generated for ${response.selected_count} collection items.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preview failed.");
    }
  }

  async function handleCreateJob() {
    if (launchBlocked) return;
    try {
      const detail = await api.createJob({ plan: currentPlan });
      setJobDetail(detail);
      setSelectedJobId(detail.job.id);
      setStatus(`Job ${detail.job.id} created.`);
      const nextJobs = await api.listJobs();
      setJobs(nextJobs);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Job creation failed.");
    }
  }

  async function handleConfirmDelete(jobId: string) {
    try {
      const detail = await api.confirmDelete(jobId);
      setJobDetail(detail);
      setStatus("Delete phase started.");
      setJobs(await api.listJobs());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete confirmation failed.");
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
      const result = await api.exportJob(jobId);
      setStatus(`Reports written to ${result.csv_path} and ${result.json_path}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Export failed.");
    }
  }

  async function handleClearLocalData() {
    try {
      await api.clearLocalData();
      setPreview(null);
      setLastPreviewSignature(null);
      setJobDetail(null);
      setSelectedJobId(null);
      setPresets([]);
      setSelectedPresetId("");
      await refreshWorkspace();
      setStatus("Local cache, job history, and stored connections were cleared.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Local data clear failed.");
    }
  }

  async function handleSavePreset() {
    if (!sourceAccount) {
      setStatus("Connect a source account before saving presets.");
      return;
    }
    const trimmedName = presetName.trim() || planName.trim();
    if (!trimmedName) {
      setStatus("Give the preset a name before saving.");
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
      setStatus(`Preset "${preset.name}" saved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Preset save failed.");
    }
  }

  function applyPreset(preset: SelectionPreset) {
    setSelectedPresetId(preset.id);
    setDateFrom(toDateTimeLocalValue(preset.filters.date_from));
    setDateTo(toDateTimeLocalValue(preset.filters.date_to));
    setTextQuery(preset.filters.text_query ?? "");
    setYearMin(toNumberInputValue(preset.filters.year_min));
    setYearMax(toNumberInputValue(preset.filters.year_max));
    setRatingMin(toNumberInputValue(preset.filters.rating_min));
    setSelectedFolderIds(preset.filters.folder_ids ?? []);
    setSelectedGenres(preset.filters.genres ?? []);
    setSelectedLabels(preset.filters.labels ?? []);
    setSelectedFormats(preset.filters.formats ?? []);
    setManualIncludeIds(preset.filters.manual_include_snapshot_item_ids ?? []);
    setManualExcludeIds(preset.filters.manual_exclude_snapshot_item_ids ?? []);
    setPreview(null);
    setLastPreviewSignature(null);
    setStatus(`Loaded preset "${preset.name}".`);
  }

  function handlePresetSelection(presetId: string) {
    setSelectedPresetId(presetId);
    const preset = presets.find((entry) => entry.id === presetId);
    if (preset) {
      applyPreset(preset);
    }
  }

  function toggleManualInclude(itemId: string) {
    setManualIncludeIds((current) =>
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId],
    );
    setManualExcludeIds((current) => current.filter((value) => value !== itemId));
  }

  function toggleManualExclude(itemId: string) {
    setManualExcludeIds((current) =>
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId],
    );
    setManualIncludeIds((current) => current.filter((value) => value !== itemId));
  }

  function setFolderOverride(sourceFolderId: string, destinationFolderId: number | null) {
    setFolderMappingOverrides((current) => {
      const next = { ...current };
      if (!destinationFolderId) {
        delete next[sourceFolderId];
      } else {
        next[sourceFolderId] = destinationFolderId;
      }
      return next;
    });
  }

  function setCustomFieldOverride(fieldName: string, destinationField: string) {
    setCustomFieldMappingOverrides((current) => ({
      ...current,
      [fieldName]: destinationField,
    }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="app-badge">CrateSync · Local v0.1</span>
        <div className="topbar-actions">
          <span className="hero-status">
            <span className={`status-dot${loading ? " status-dot-busy" : ""}`} />
            {loading ? "Refreshing workspace" : "Backend online"}
          </span>
          <button className="text-btn" onClick={() => void handleClearLocalData()}>
            Clear local data
          </button>
        </div>
      </header>

      <section className="shell-grid">
        <aside className="shell-left">
          <div className="left-hero">
            <h1>CrateSync</h1>
            <p className="lead-copy">
              Shape the migration set, review conflicts inline, and launch copy or move jobs with
              audit visibility before anything destructive happens.
            </p>
            <div className="status-line">{status}</div>
          </div>

          <section className="rail-section">
            <div className="section-label">Accounts</div>
            <AccountCard
              role="source"
              account={sourceAccount}
              itemCount={sourceSnapshot?.total_items ?? 0}
              onConnect={handleConnect}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
            <AccountCard
              role="destination"
              account={destinationAccount}
              itemCount={destinationSnapshot?.total_items ?? 0}
              onConnect={handleConnect}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
          </section>

          <section className="rail-section">
            <div className="section-label">Planner</div>
            <div className="editorial-title">Migration composer</div>

            <div className="field-stack">
              <Field label="Plan name">
                <input
                  type="text"
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                />
              </Field>

              <Field label="Workflow mode">
                <div className="toggle-group">
                  <button
                    className={`toggle-option${workflowMode === "copy" ? " active" : ""}`}
                    onClick={() => setWorkflowMode("copy")}
                  >
                    Copy only
                  </button>
                  <button
                    className={`toggle-option${workflowMode === "move" ? " active" : ""}`}
                    onClick={() => setWorkflowMode("move")}
                  >
                    Two-phase move
                  </button>
                </div>
              </Field>

              <div className="field-grid">
                <Field label="Added after">
                  <input
                    type="datetime-local"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                  />
                </Field>
                <Field label="Added on or before">
                  <input
                    type="datetime-local"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Text filter">
                <input
                  type="text"
                  placeholder="artist, title, label, genre"
                  value={textQuery}
                  onChange={(event) => setTextQuery(event.target.value)}
                />
              </Field>

              <div className="field-grid field-grid-compact">
                <Field label="Year min">
                  <input
                    type="number"
                    value={yearMin}
                    onChange={(event) => setYearMin(event.target.value)}
                  />
                </Field>
                <Field label="Year max">
                  <input
                    type="number"
                    value={yearMax}
                    onChange={(event) => setYearMax(event.target.value)}
                  />
                </Field>
                <Field label="Rating min">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={ratingMin}
                    onChange={(event) => setRatingMin(event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Folders">
                <select
                  multiple
                  value={selectedFolderIds.map(String)}
                  onChange={(event) =>
                    setSelectedFolderIds(
                      Array.from(event.currentTarget.selectedOptions, (option) =>
                        Number(option.value),
                      ),
                    )
                  }
                >
                  {folderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="field-grid">
                <Field label="Genres">
                  <MultiValueSelect
                    options={genreOptions}
                    values={selectedGenres}
                    onChange={setSelectedGenres}
                  />
                </Field>
                <Field label="Labels">
                  <MultiValueSelect
                    options={labelOptions}
                    values={selectedLabels}
                    onChange={setSelectedLabels}
                  />
                </Field>
              </div>

              <Field label="Formats">
                <MultiValueSelect
                  options={formatOptions}
                  values={selectedFormats}
                  onChange={setSelectedFormats}
                />
              </Field>
            </div>

            <div className="planner-footer">
              <div className="planner-actions">
                <button className="btn btn-ghost" onClick={() => void handlePreview()}>
                  Preview plan
                </button>
                <button
                  className="btn btn-primary"
                  disabled={launchBlocked}
                  onClick={() => void handleCreateJob()}
                >
                  Launch job
                </button>
              </div>

              <div className="stats-line">
                <StatBlock label="Selected" value={preview?.selected_count ?? 0} />
                <StatBlock label="Retained" value={preview?.retained_count ?? 0} />
                <StatBlock
                  label="Duplicates"
                  value={preview?.duplicate_release_ids.length ?? 0}
                  muted
                />
              </div>
            </div>

            <section className="subsection">
              <div className="section-label">Presets</div>
              <div className="field-stack">
                <Field label="Saved presets">
                  <select
                    value={selectedPresetId}
                    disabled={!sourceAccount || presets.length === 0}
                    onChange={(event) => handlePresetSelection(event.target.value)}
                  >
                    <option value="">Select a preset</option>
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Save current filter set">
                  <div className="inline-action">
                    <input
                      type="text"
                      placeholder="Night session split"
                      value={presetName}
                      onChange={(event) => setPresetName(event.target.value)}
                    />
                    <button className="btn btn-ghost" onClick={() => void handleSavePreset()}>
                      Save
                    </button>
                  </div>
                </Field>
              </div>
            </section>
          </section>
        </aside>

        <section className="shell-right">
          <SnapshotSection
            title={`Source — ${sourceAccount?.username ?? "Not connected"}`}
            snapshot={sourceSnapshot}
            items={sourceItems}
          />
          <SnapshotSection
            title={`Destination — ${destinationAccount?.username ?? "Not connected"}`}
            snapshot={destinationSnapshot}
            items={destinationItems}
          />

          <section className="canvas-section">
            <div className="canvas-header">
              <div>
                <div className="section-label">Preview</div>
                <h2>Review workbench</h2>
              </div>
              <div className="header-note">
                {preview
                  ? `${preview.selected_count} selected · ${preview.retained_count} retained`
                  : "Generate a preview to review selections and resolve conflicts."}
              </div>
            </div>

            {previewIsStale && (
              <div className="message message-warning">
                Planner settings changed after the last preview. Re-run preview before launching a
                job.
              </div>
            )}

            {!preview && (
              <div className="empty-block">
                Preview results, duplicate detection, and conflict resolution will appear here.
              </div>
            )}

            {preview && (
              <>
                {preview.warnings.length > 0 && (
                  <div className="message-list">
                    {preview.warnings.map((warning) => (
                      <div key={warning.code} className="message message-warning">
                        {warning.message}
                      </div>
                    ))}
                  </div>
                )}

                {preview.blocking_conflicts.length > 0 && (
                  <div className="conflict-grid">
                    {folderConflicts.map((conflict) => (
                      <FolderConflictCard
                        key={`folder-${String(conflict.payload.source_folder_id)}`}
                        conflict={conflict}
                        destinationFolderLookup={destinationFolderLookup}
                        selectedValue={
                          folderMappingOverrides[String(conflict.payload.source_folder_id)] ?? null
                        }
                        onChange={setFolderOverride}
                      />
                    ))}
                    {customFieldConflicts.map((conflict) => (
                      <CustomFieldConflictCard
                        key={`field-${String(conflict.payload.field_name)}`}
                        conflict={conflict}
                        value={
                          customFieldMappingOverrides[String(conflict.payload.field_name)] ?? ""
                        }
                        onChange={setCustomFieldOverride}
                      />
                    ))}
                  </div>
                )}

                <div className="capability-row">
                  {renderCapabilities(preview.metadata_capabilities).map((capability) => (
                    <span key={capability} className="capability-chip">
                      {capability}
                    </span>
                  ))}
                </div>

                <div className="review-summary">
                  <span>{preview.duplicate_release_ids.length} duplicate release IDs skipped.</span>
                  <span>{manualIncludeIds.length} manual include overrides.</span>
                  <span>{manualExcludeIds.length} manual exclude overrides.</span>
                </div>

                <div className="table-wrap table-wrap-tall">
                  <table className="data-table review-table">
                    <thead>
                      <tr>
                        <th>Artist</th>
                        <th>Title</th>
                        <th>Source folder</th>
                        <th>Release</th>
                        <th>Added</th>
                        <th>Preview</th>
                        <th>Overrides</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceItems.map((item) => {
                        const manuallyIncluded = manualIncludeIds.includes(item.id);
                        const manuallyExcluded = manualExcludeIds.includes(item.id);
                        const isSelected = previewSelectedIds.has(item.id);
                        const isDuplicate = duplicateReleaseIds.has(item.release_id);
                        return (
                          <tr
                            key={item.id}
                            className={
                              isSelected
                                ? "row-selected"
                                : manuallyExcluded
                                  ? "row-excluded"
                                  : undefined
                            }
                          >
                            <td>{item.artist}</td>
                            <td>{item.title}</td>
                            <td>{item.folder_name ?? `Folder ${item.folder_id}`}</td>
                            <td>{item.release_id}</td>
                            <td>{formatDate(item.date_added)}</td>
                            <td>
                              <div className="preview-state">
                                <span className={`state-pill${isSelected ? " active" : ""}`}>
                                  {isSelected ? "Selected" : "Retained"}
                                </span>
                                {isDuplicate && <span className="state-pill warning">Duplicate</span>}
                              </div>
                            </td>
                            <td>
                              <div className="override-actions">
                                <button
                                  className={`chip-button${manuallyIncluded ? " active" : ""}`}
                                  onClick={() => toggleManualInclude(item.id)}
                                >
                                  Include
                                </button>
                                <button
                                  className={`chip-button${manuallyExcluded ? " active danger" : ""}`}
                                  onClick={() => toggleManualExclude(item.id)}
                                >
                                  Exclude
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="canvas-section">
            <div className="canvas-header">
              <div>
                <div className="section-label">Execution</div>
                <h2>Job console</h2>
              </div>
              <div className="header-note">
                {jobDetail ? formatJobStatus(jobDetail.job.status) : "Choose a recent job to inspect."}
              </div>
            </div>

            <div className="history-strip">
              {recentJobs.length === 0 && <span className="history-empty">No jobs created yet.</span>}
              {recentJobs.map((job) => (
                <button
                  key={job.id}
                  className={`history-pill${selectedJobId === job.id ? " active" : ""}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <span>{job.name}</span>
                  <span>{formatJobStatus(job.status)}</span>
                </button>
              ))}
            </div>

            {!jobDetail && (
              <div className="empty-block">
                Launch a job or select a recent one to inspect events, item outcomes, and exports.
              </div>
            )}

            {jobDetail && (
              <>
                <div className="job-toolbar">
                  <div>
                    <div className="job-name">{jobDetail.job.name}</div>
                    <div className="job-meta">
                      {jobDetail.job.workflow_mode} workflow · created {formatDateTime(jobDetail.job.created_at)}
                    </div>
                  </div>
                  <div className="toolbar-actions">
                    {jobDetail.job.status === "awaiting_delete_confirmation" && (
                      <>
                        <button
                          className="btn btn-ghost"
                          onClick={() => void handleRollback(jobDetail.job.id)}
                        >
                          Roll back adds
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => void handleConfirmDelete(jobDetail.job.id)}
                        >
                          Confirm delete
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost" onClick={() => void handleExport(jobDetail.job.id)}>
                      Export reports
                    </button>
                  </div>
                </div>

                <div className="summary-strip">
                  {Object.entries(jobDetail.job.summary).map(([key, value]) => (
                    <StatBlock key={key} label={key.replace(/_/g, " ")} value={value} small />
                  ))}
                </div>

                <div className="event-feed">
                  {jobDetail.events.length === 0 && (
                    <div className="empty-block compact">No job events recorded yet.</div>
                  )}
                  {jobDetail.events.map((event) => (
                    <div key={event.id} className={`event event-${event.level}`}>
                      <div className="event-stripe" />
                      <div className="event-body">
                        <strong>{formatDateTime(event.created_at)}</strong>
                        <span>{event.message}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Release</th>
                        <th>Instance</th>
                        <th>Status</th>
                        <th>Destination</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobDetail.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.release_id}</td>
                          <td>{item.instance_id}</td>
                          <td>
                            <span className={`state-pill status-${statusTone(item.status)}`}>
                              {item.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td>{item.destination_folder_id ?? "—"}</td>
                          <td>{item.message ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}

function AccountCard({
  role,
  account,
  itemCount,
  onConnect,
  onSync,
  onDisconnect,
}: {
  role: "source" | "destination";
  account?: ConnectedAccount;
  itemCount: number;
  onConnect(role: "source" | "destination"): void;
  onSync(accountId: string): void;
  onDisconnect(accountId: string): void;
}) {
  if (!account) {
    return (
      <article className="credit-card credit-card-empty">
        <span className={`role-chip role-${role}`}>{role}</span>
        <div className="credit-name">Authorize {role}</div>
        <p className="credit-meta">Connect the {role} Discogs account to populate local snapshots.</p>
        <button className="btn btn-primary" onClick={() => onConnect(role)}>
          Connect account
        </button>
      </article>
    );
  }

  return (
    <article className="credit-card">
      <span className={`role-chip role-${role}`}>{role}</span>
      <div className="credit-name">{account.username}</div>
      <p className="credit-meta">
        {account.last_synced_at
          ? `Synced ${formatDateTime(account.last_synced_at)} · ${itemCount} items`
          : "Connected, not yet synced"}
      </p>
      <div className="inline-button-row">
        <button className="btn btn-primary" onClick={() => onSync(account.id)}>
          Sync collection
        </button>
        <button className="btn btn-ghost" onClick={() => onDisconnect(account.id)}>
          Disconnect
        </button>
      </div>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function MultiValueSelect({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange(values: string[]): void;
}) {
  return (
    <select
      multiple
      value={values}
      onChange={(event) =>
        onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
      }
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function StatBlock({
  label,
  value,
  muted = false,
  small = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`stat-block${small ? " stat-block-small" : ""}`}>
      <span className={`stat-value${muted ? " muted" : ""}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function SnapshotSection({
  title,
  snapshot,
  items,
}: {
  title: string;
  snapshot: CollectionSnapshot | null;
  items: CollectionItemSnapshot[];
}) {
  const [pageSize, setPageSize] = useState<SnapshotPageSize>(50);
  const [pageIndex, setPageIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<SnapshotSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SnapshotSortDirection>("asc");

  useEffect(() => {
    setPageIndex(0);
  }, [items]);

  const sortedItems = sortSnapshotItems(items, sortColumn, sortDirection);
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const paginatedItems = sortedItems.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
  const pageStart = totalItems === 0 ? 0 : currentPage * pageSize + 1;
  const pageEnd = totalItems === 0 ? 0 : Math.min((currentPage + 1) * pageSize, totalItems);
  const tableWrapClassName = `table-wrap${pageSize > 50 ? " table-wrap-tall" : ""}`;
  const columns: Array<{ key: SnapshotSortColumn; label: string }> = [
    { key: "artist", label: "Artist" },
    { key: "title", label: "Title" },
    { key: "year", label: "Year" },
    { key: "folder", label: "Folder" },
    { key: "genre", label: "Genre" },
    { key: "label", label: "Label" },
    { key: "added", label: "Added" },
  ];

  function handleSort(nextColumn: SnapshotSortColumn) {
    setPageIndex(0);
    if (sortColumn === nextColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(nextColumn);
    setSortDirection("asc");
  }

  return (
    <section className="canvas-section">
      <div className="canvas-header">
        <div>
          <div className="section-label">Snapshot</div>
          <h2>{title}</h2>
        </div>
        <div className="header-note">
          {snapshot
            ? `${snapshot.total_items} items · synced ${formatDateTime(snapshot.created_at)}`
            : "No local snapshot"}
        </div>
      </div>
      <div className="snapshot-toolbar">
        <div className="snapshot-controls">
          <label className="snapshot-page-size">
            <span>Rows</span>
            <select
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as SnapshotPageSize);
                setPageIndex(0);
              }}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
            </select>
          </label>
          <div className="header-note">
            {totalItems === 0 ? "0 items" : `Showing ${pageStart}-${pageEnd} of ${totalItems}`}
          </div>
        </div>
        <div className="snapshot-pagination">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={currentPage === 0 || totalItems === 0}
            onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
          >
            Previous
          </button>
          <span className="header-note">
            Page {totalItems === 0 ? 0 : currentPage + 1} of {totalItems === 0 ? 0 : totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={currentPage >= totalPages - 1 || totalItems === 0}
            onClick={() => setPageIndex((value) => Math.min(totalPages - 1, value + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <div className={tableWrapClassName}>
        <table className="data-table snapshot-table">
          <colgroup>
            <col className="snapshot-col-artist" />
            <col className="snapshot-col-title" />
            <col className="snapshot-col-year" />
            <col className="snapshot-col-folder" />
            <col className="snapshot-col-genre" />
            <col className="snapshot-col-label" />
            <col className="snapshot-col-added" />
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => {
                const isActive = sortColumn === column.key;
                return (
                  <th key={column.key}>
                    <button
                      type="button"
                      className={`snapshot-sort-button${isActive ? " active" : ""}`}
                      onClick={() => handleSort(column.key)}
                    >
                      <span>{column.label}</span>
                      <span
                        className={`snapshot-sort-chevron${isActive ? ` ${sortDirection}` : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Sync this account to populate the local snapshot.
                </td>
              </tr>
            )}
            {paginatedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.artist}</td>
                <td>{item.title}</td>
                <td>{item.year ?? "—"}</td>
                <td>{item.folder_name ?? item.folder_id}</td>
                <td>{item.genres[0] ?? "—"}</td>
                <td>{item.labels[0] ?? "—"}</td>
                <td>{formatDate(item.date_added)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FolderConflictCard({
  conflict,
  destinationFolderLookup,
  selectedValue,
  onChange,
}: {
  conflict: PreviewConflict;
  destinationFolderLookup: Record<number, string>;
  selectedValue: number | null;
  onChange(sourceFolderId: string, destinationFolderId: number | null): void;
}) {
  const sourceFolderId = String(conflict.payload.source_folder_id ?? "");
  const folderName = String(conflict.payload.folder_name ?? "Unknown folder");
  const destinationFolderIds = Array.isArray(conflict.payload.destination_folder_ids)
    ? conflict.payload.destination_folder_ids.map((value) => Number(value))
    : [];

  return (
    <article className="conflict-card">
      <div className="section-label">Folder mapping</div>
      <h3>{folderName}</h3>
      <p>{conflict.message}</p>
      <select
        value={selectedValue ? String(selectedValue) : ""}
        onChange={(event) =>
          onChange(sourceFolderId, event.target.value ? Number(event.target.value) : null)
        }
      >
        <option value="">Choose destination folder</option>
        {destinationFolderIds.map((folderId) => (
          <option key={folderId} value={folderId}>
            {destinationFolderLookup[folderId] ?? `Folder ${folderId}`}
          </option>
        ))}
      </select>
    </article>
  );
}

function CustomFieldConflictCard({
  conflict,
  value,
  onChange,
}: {
  conflict: PreviewConflict;
  value: string;
  onChange(fieldName: string, destinationField: string): void;
}) {
  const fieldName = String(conflict.payload.field_name ?? "custom_field");

  return (
    <article className="conflict-card">
      <div className="section-label">Custom field</div>
      <h3>{fieldName}</h3>
      <p>{conflict.message}</p>
      <div className="inline-action">
        <input
          type="text"
          placeholder={`Destination field for ${fieldName}`}
          value={value}
          onChange={(event) => onChange(fieldName, event.target.value)}
        />
        <button className="btn btn-ghost" onClick={() => onChange(fieldName, fieldName)}>
          Use same name
        </button>
      </div>
    </article>
  );
}

function buildFilters(input: {
  dateFrom: string;
  dateTo: string;
  textQuery: string;
  yearMin: string;
  yearMax: string;
  ratingMin: string;
  selectedFolderIds: number[];
  selectedGenres: string[];
  selectedLabels: string[];
  selectedFormats: string[];
  manualIncludeIds: string[];
  manualExcludeIds: string[];
}): SelectionFilters {
  return {
    date_from: input.dateFrom ? toIsoDateTime(input.dateFrom) : null,
    date_to: input.dateTo ? toIsoDateTime(input.dateTo) : null,
    folder_ids: input.selectedFolderIds,
    genres: input.selectedGenres,
    labels: input.selectedLabels,
    formats: input.selectedFormats,
    year_min: parseOptionalNumber(input.yearMin),
    year_max: parseOptionalNumber(input.yearMax),
    rating_min: parseOptionalNumber(input.ratingMin),
    manual_include_snapshot_item_ids: input.manualIncludeIds,
    manual_exclude_snapshot_item_ids: input.manualExcludeIds,
    text_query: input.textQuery.trim() || null,
  };
}

function deriveFolderOptions(items: CollectionItemSnapshot[]) {
  const seen = new Map<number, string>();
  for (const item of items) {
    if (!seen.has(item.folder_id)) {
      seen.set(item.folder_id, item.folder_name ?? `Folder ${item.folder_id}`);
    }
  }
  return Array.from(seen.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function deriveFolderLookup(items: CollectionItemSnapshot[]) {
  const lookup: Record<number, string> = {};
  for (const item of items) {
    lookup[item.folder_id] = item.folder_name ?? `Folder ${item.folder_id}`;
  }
  return lookup;
}

function deriveStringOptions(
  items: CollectionItemSnapshot[],
  key: "genres" | "labels" | "formats",
) {
  const values = new Set<string>();
  for (const item of items) {
    for (const entry of item[key]) {
      if (entry) values.add(entry);
    }
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right));
}

function sanitizeStringMap(values: Record<string, string>) {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (trimmed) {
      next[key] = trimmed;
    }
  }
  return next;
}

function renderCapabilities(metadata: Record<string, unknown>) {
  return Object.entries(metadata).map(([key, value]) => {
    const normalizedKey = key.replace(/_/g, " ");
    if (typeof value === "boolean") {
      return `${normalizedKey}: ${value ? "yes" : "no"}`;
    }
    return `${normalizedKey}: ${String(value)}`;
  });
}

function statusTone(status: string) {
  if (status.includes("fail")) return "error";
  if (status.includes("skip") || status.includes("awaiting")) return "warning";
  if (status.includes("copied") || status.includes("deleted") || status.includes("rolled")) {
    return "success";
  }
  return "default";
}

function formatJobStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function sortSnapshotItems(
  items: CollectionItemSnapshot[],
  sortColumn: SnapshotSortColumn | null,
  sortDirection: SnapshotSortDirection,
) {
  if (!sortColumn) return items;

  return [...items].sort((left, right) =>
    compareSnapshotSortValues(
      snapshotSortValue(left, sortColumn),
      snapshotSortValue(right, sortColumn),
      sortDirection,
    ),
  );
}

function snapshotSortValue(item: CollectionItemSnapshot, column: SnapshotSortColumn) {
  switch (column) {
    case "artist":
      return item.artist;
    case "title":
      return item.title;
    case "year":
      return item.year ?? null;
    case "folder":
      return item.folder_name ?? String(item.folder_id);
    case "genre":
      return item.genres[0] ?? null;
    case "label":
      return item.labels[0] ?? null;
    case "added":
      return item.date_added ? new Date(item.date_added).getTime() : null;
  }
}

function compareSnapshotSortValues(
  left: string | number | null,
  right: string | number | null,
  direction: SnapshotSortDirection,
) {
  const multiplier = direction === "asc" ? 1 : -1;
  const leftEmpty = left === null || left === "";
  const rightEmpty = right === null || right === "";

  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return direction === "asc" ? 1 : -1;
  if (rightEmpty) return direction === "asc" ? -1 : 1;

  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * multiplier;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: "base" }) * multiplier;
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function parseOptionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function toNumberInputValue(value?: number | null) {
  return value === null || value === undefined ? "" : String(value);
}
