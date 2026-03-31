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
type FilterKey =
  | "specific_date"
  | "date_range"
  | "artist_search"
  | "title_search"
  | "label_search"
  | "genre_search"
  | "format_search"
  | "style_search"
  | "genres"
  | "labels"
  | "formats"
  | "styles"
  | "folders";

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "specific_date", label: "Specific date" },
  { key: "date_range", label: "Date range" },
  { key: "artist_search", label: "Artist search" },
  { key: "title_search", label: "Title search" },
  { key: "label_search", label: "Label search" },
  { key: "genre_search", label: "Genre search" },
  { key: "format_search", label: "Format search" },
  { key: "style_search", label: "Style search" },
  { key: "genres", label: "Genres" },
  { key: "labels", label: "Labels" },
  { key: "formats", label: "Formats" },
  { key: "styles", label: "Styles" },
  { key: "folders", label: "Folders" },
];

const EMPTY_FILTERS: SelectionFilters = {
  date_from: null,
  date_to: null,
  artist_query: null,
  title_query: null,
  label_query: null,
  genre_query: null,
  format_query: null,
  style_query: null,
  folder_ids: [],
  genres: [],
  labels: [],
  formats: [],
  styles: [],
  year_min: null,
  year_max: null,
  rating_min: null,
  manual_include_snapshot_item_ids: [],
  manual_exclude_snapshot_item_ids: [],
  text_query: null,
};

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
  const [nextFilterToAdd, setNextFilterToAdd] = useState<FilterKey | "">("");
  const [reviewTableMode, setReviewTableMode] = useState<"selected" | "all">("selected");

  const [planName, setPlanName] = useState("Digital archive split");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("copy");
  const [activeFilterKeys, setActiveFilterKeys] = useState<FilterKey[]>([]);
  const [specificDate, setSpecificDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [labelQuery, setLabelQuery] = useState("");
  const [genreQuery, setGenreQuery] = useState("");
  const [formatQuery, setFormatQuery] = useState("");
  const [styleQuery, setStyleQuery] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedSourceItemIds, setSelectedSourceItemIds] = useState<string[]>([]);
  const [folderMappingOverrides, setFolderMappingOverrides] = useState<Record<string, number>>({});
  const [customFieldMappingOverrides, setCustomFieldMappingOverrides] = useState<
    Record<string, string>
  >({});

  const sourceAccount = accounts.find((account) => account.role === "source");
  const destinationAccount = accounts.find((account) => account.role === "destination");

  const filters = buildFilters({
    activeFilterKeys,
    specificDate,
    dateFrom,
    dateTo,
    artistQuery,
    titleQuery,
    labelQuery,
    genreQuery,
    formatQuery,
    styleQuery,
    selectedFolderIds,
    selectedGenres,
    selectedLabels,
    selectedFormats,
    selectedStyles,
  });

  const currentPlan: MigrationPlanPreviewRequest = {
    source_account_id: sourceAccount?.id ?? "",
    destination_account_id: destinationAccount?.id ?? "",
    snapshot_id: sourceSnapshot?.id ?? "",
    selected_snapshot_item_ids: selectedSourceItemIds,
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
  const selectedSourceIdSet = new Set(selectedSourceItemIds);
  const filteredSourceItems = filterSourceItems(sourceItems, filters);
  const filteredSourceItemIds = filteredSourceItems.map((item) => item.id);
  const selectedSourceCount = selectedSourceItemIds.length;
  const launchBlocked =
    !preview ||
    previewIsStale ||
    selectedSourceCount === 0 ||
    preview.selected_count === 0 ||
    preview.blocking_conflicts.length > 0 ||
    !sourceAccount ||
    !destinationAccount ||
    !sourceSnapshot;

  const folderOptions = deriveFolderOptions(sourceItems);
  const genreOptions = deriveStringOptions(sourceItems, "genres");
  const labelOptions = deriveStringOptions(sourceItems, "labels");
  const formatOptions = deriveStringOptions(sourceItems, "formats");
  const styleOptions = deriveStringOptions(sourceItems, "styles");
  const destinationFolderLookup = deriveFolderLookup(destinationItems);
  const recentJobs = jobs.slice(0, 8);
  const previewConflicts = preview?.blocking_conflicts ?? [];
  const folderConflicts = previewConflicts.filter((conflict) => conflict.type === "folder_mapping");
  const customFieldConflicts = previewConflicts.filter(
    (conflict) => conflict.type === "custom_field_mapping",
  );
  const availableFilterOptions = FILTER_OPTIONS.filter((option) => {
    if (activeFilterKeys.includes(option.key)) return false;
    if (
      option.key === "specific_date" &&
      activeFilterKeys.includes("date_range")
    ) {
      return false;
    }
    if (
      option.key === "date_range" &&
      activeFilterKeys.includes("specific_date")
    ) {
      return false;
    }
    return true;
  });
  const reviewItems =
    reviewTableMode === "selected" ? preview?.selected_items ?? [] : sourceItems;
  const reviewState = deriveReviewState({
    preview,
    previewIsStale,
    selectedSourceCount,
    sourceAccount,
    destinationAccount,
    sourceSnapshot,
  });

  useEffect(() => {
    if (!nextFilterToAdd && availableFilterOptions[0]) {
      setNextFilterToAdd(availableFilterOptions[0].key);
      return;
    }
    if (
      nextFilterToAdd &&
      !availableFilterOptions.some((option) => option.key === nextFilterToAdd)
    ) {
      setNextFilterToAdd(availableFilterOptions[0]?.key ?? "");
    }
  }, [availableFilterOptions, nextFilterToAdd]);

  useEffect(() => {
    const validSourceIds = new Set(sourceItems.map((item) => item.id));
    setSelectedSourceItemIds((current) => current.filter((itemId) => validSourceIds.has(itemId)));
  }, [sourceItems]);

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
  }, []);

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
      setSelectedSourceItemIds([]);
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
      setReviewTableMode("selected");
      setStatus(
        response.blocking_conflicts.length > 0
          ? `Preview generated with ${response.blocking_conflicts.length} blocking conflict${response.blocking_conflicts.length !== 1 ? "s" : ""}.`
          : `Preview generated for ${response.selected_count} selected release${response.selected_count !== 1 ? "s" : ""}.`,
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
      setSelectedSourceItemIds([]);
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
    setLabelQuery(loadedState.labelQuery);
    setGenreQuery(loadedState.genreQuery);
    setFormatQuery(loadedState.formatQuery);
    setStyleQuery(loadedState.styleQuery);
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
    if (preset) {
      applyPreset(preset);
    }
  }

  function addFilter(key: FilterKey) {
    setActiveFilterKeys((current) => {
      const withoutConflicts = current.filter((value) => {
        if (key === "specific_date" && value === "date_range") return false;
        if (key === "date_range" && value === "specific_date") return false;
        return true;
      });
      return withoutConflicts.includes(key) ? withoutConflicts : [...withoutConflicts, key];
    });

    if (key === "specific_date") {
      setDateFrom("");
      setDateTo("");
    }
    if (key === "date_range") {
      setSpecificDate("");
    }
  }

  function removeFilter(key: FilterKey) {
    setActiveFilterKeys((current) => current.filter((value) => value !== key));
    if (key === "specific_date") setSpecificDate("");
    if (key === "date_range") {
      setDateFrom("");
      setDateTo("");
    }
    if (key === "artist_search") setArtistQuery("");
    if (key === "title_search") setTitleQuery("");
    if (key === "label_search") setLabelQuery("");
    if (key === "genre_search") setGenreQuery("");
    if (key === "format_search") setFormatQuery("");
    if (key === "style_search") setStyleQuery("");
    if (key === "genres") setSelectedGenres([]);
    if (key === "labels") setSelectedLabels([]);
    if (key === "formats") setSelectedFormats([]);
    if (key === "styles") setSelectedStyles([]);
    if (key === "folders") setSelectedFolderIds([]);
  }

  function toggleSourceSelection(itemId: string) {
    setSelectedSourceItemIds((current) =>
      current.includes(itemId)
        ? current.filter((value) => value !== itemId)
        : [...current, itemId],
    );
  }

  function selectFilteredItems() {
    setSelectedSourceItemIds((current) => appendUnique(current, filteredSourceItemIds));
  }

  function deselectFilteredItems() {
    const visibleIds = new Set(filteredSourceItemIds);
    setSelectedSourceItemIds((current) => current.filter((itemId) => !visibleIds.has(itemId)));
  }

  function clearSelectedItems() {
    setSelectedSourceItemIds([]);
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

  function renderFilterBlock(key: FilterKey) {
    switch (key) {
      case "specific_date":
        return (
          <FilterBlock
            key={key}
            label="Specific date"
            description="Keep releases added on one exact day."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="date"
              value={specificDate}
              onChange={(event) => setSpecificDate(event.target.value)}
            />
          </FilterBlock>
        );
      case "date_range":
        return (
          <FilterBlock
            key={key}
            label="Date range"
            description="Keep releases added within a start and end window."
            onRemove={() => removeFilter(key)}
          >
            <div className="field-grid">
              <Field label="Added after">
                <input
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </Field>
              <Field label="Added before">
                <input
                  type="datetime-local"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </Field>
            </div>
          </FilterBlock>
        );
      case "artist_search":
        return (
          <FilterBlock
            key={key}
            label="Artist search"
            description="Match artist names without affecting title or label fields."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="text"
              placeholder="e.g. Four Tet"
              value={artistQuery}
              onChange={(event) => setArtistQuery(event.target.value)}
            />
          </FilterBlock>
        );
      case "title_search":
        return (
          <FilterBlock
            key={key}
            label="Title search"
            description="Search release titles only."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="text"
              placeholder="e.g. Rounds"
              value={titleQuery}
              onChange={(event) => setTitleQuery(event.target.value)}
            />
          </FilterBlock>
        );
      case "label_search":
        return (
          <FilterBlock
            key={key}
            label="Label search"
            description="Search label names without mixing them with artist or title."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="text"
              placeholder="e.g. Warp"
              value={labelQuery}
              onChange={(event) => setLabelQuery(event.target.value)}
            />
          </FilterBlock>
        );
      case "genre_search":
        return (
          <FilterBlock
            key={key}
            label="Genre search"
            description="Search genre values directly."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="text"
              placeholder="e.g. Electronic"
              value={genreQuery}
              onChange={(event) => setGenreQuery(event.target.value)}
            />
          </FilterBlock>
        );
      case "format_search":
        return (
          <FilterBlock
            key={key}
            label="Format search"
            description="Search Discogs format values."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="text"
              placeholder="e.g. Vinyl"
              value={formatQuery}
              onChange={(event) => setFormatQuery(event.target.value)}
            />
          </FilterBlock>
        );
      case "style_search":
        return (
          <FilterBlock
            key={key}
            label="Style search"
            description="Search style values independently from genres."
            onRemove={() => removeFilter(key)}
          >
            <input
              type="text"
              placeholder="e.g. Deep House"
              value={styleQuery}
              onChange={(event) => setStyleQuery(event.target.value)}
            />
          </FilterBlock>
        );
      case "genres":
        return (
          <FilterBlock
            key={key}
            label="Genres"
            description="Narrow the source snapshot by genre."
            onRemove={() => removeFilter(key)}
          >
            <MultiValueSelect
              options={genreOptions}
              values={selectedGenres}
              onChange={setSelectedGenres}
            />
          </FilterBlock>
        );
      case "labels":
        return (
          <FilterBlock
            key={key}
            label="Labels"
            description="Limit the list to selected labels."
            onRemove={() => removeFilter(key)}
          >
            <MultiValueSelect
              options={labelOptions}
              values={selectedLabels}
              onChange={setSelectedLabels}
            />
          </FilterBlock>
        );
      case "formats":
        return (
          <FilterBlock
            key={key}
            label="Formats"
            description="Filter the source list by Discogs formats."
            onRemove={() => removeFilter(key)}
          >
            <MultiValueSelect
              options={formatOptions}
              values={selectedFormats}
              onChange={setSelectedFormats}
            />
          </FilterBlock>
        );
      case "styles":
        return (
          <FilterBlock
            key={key}
            label="Styles"
            description="Use Discogs styles as an optional drill-down."
            onRemove={() => removeFilter(key)}
          >
            <MultiValueSelect
              options={styleOptions}
              values={selectedStyles}
              onChange={setSelectedStyles}
            />
          </FilterBlock>
        );
      case "folders":
        return (
          <FilterBlock
            key={key}
            label="Folders"
            description="Advanced: narrow the source list by folder."
            onRemove={() => removeFilter(key)}
          >
            <select
              multiple
              value={selectedFolderIds.map(String)}
              onChange={(event) =>
                setSelectedFolderIds(
                  Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value)),
                )
              }
            >
              {folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterBlock>
        );
    }
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
              Filter the source view only when needed, explicitly pick the releases to migrate, and
              use the review step to confirm exactly what will happen before launch.
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
            <div className="planner-header">
              <div>
                <div className="section-label">Step 1</div>
                <div className="editorial-title">Build the source view</div>
              </div>

              <details className="saved-views-menu">
                <summary>Saved views</summary>
                <div className="saved-views-panel">
                  <Field label="Open saved view">
                    <select
                      value={selectedPresetId}
                      disabled={!sourceAccount || presets.length === 0}
                      onChange={(event) => handlePresetSelection(event.target.value)}
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
                        onChange={(event) => setPresetName(event.target.value)}
                      />
                      <button className="btn btn-ghost" onClick={() => void handleSavePreset()}>
                        Save
                      </button>
                    </div>
                  </Field>
                </div>
              </details>
            </div>

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

              <div className="filter-builder">
                <div className="filter-builder-header">
                  <div>
                    <div className="field-label">Optional filters</div>
                    <p className="filter-builder-copy">
                      Add only the filters you want to use, then choose releases from the source
                      table.
                    </p>
                  </div>
                </div>

                {activeFilterKeys.length === 0 && (
                  <div className="empty-block compact">
                    No optional filters enabled. Add only the search or metadata fields you want to
                    narrow the source snapshot.
                  </div>
                )}

                <div className="filter-list">{activeFilterKeys.map(renderFilterBlock)}</div>

                {availableFilterOptions.length > 0 && (
                  <div className="filter-add-row">
                    <select
                      value={nextFilterToAdd}
                      onChange={(event) => setNextFilterToAdd(event.target.value as FilterKey)}
                    >
                      {availableFilterOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-ghost"
                      disabled={!nextFilterToAdd}
                      onClick={() => nextFilterToAdd && addFilter(nextFilterToAdd)}
                    >
                      Add filter
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="planner-footer">
              <div className="stats-line">
                <StatBlock label="Selected releases" value={selectedSourceCount} />
                <StatBlock label="Visible after filters" value={filteredSourceItems.length} />
                <StatBlock label="Source total" value={sourceItems.length} muted />
              </div>
            </div>
          </section>
        </aside>

        <section className="shell-right">
          <SourceSelectionSection
            title={`Source selection — ${sourceAccount?.username ?? "Not connected"}`}
            snapshot={sourceSnapshot}
            items={filteredSourceItems}
            totalSourceItems={sourceItems.length}
            selectedCount={selectedSourceCount}
            selectedItemIds={selectedSourceIdSet}
            onToggleSelect={toggleSourceSelection}
            onSelectAllVisible={selectFilteredItems}
            onDeselectVisible={deselectFilteredItems}
            onClearSelection={clearSelectedItems}
          />

          <SnapshotSection
            title={`Destination reference — ${destinationAccount?.username ?? "Not connected"}`}
            snapshot={destinationSnapshot}
            items={destinationItems}
          />

          <section className="canvas-section">
            <div className="canvas-header">
              <div>
                <div className="section-label">Step 3</div>
                <h2>Review and launch</h2>
              </div>
              <div className="toolbar-actions">
                <button className="btn btn-ghost" onClick={() => void handlePreview()}>
                  Generate preview
                </button>
                <button
                  className="btn btn-primary"
                  disabled={launchBlocked}
                  onClick={() => void handleCreateJob()}
                >
                  Launch job
                </button>
              </div>
            </div>

            <div className={`review-banner review-banner-${reviewState.tone}`}>
              <div className="section-label">Next action</div>
              <h3>{reviewState.title}</h3>
              <p>{reviewState.message}</p>
            </div>

            <div className="summary-strip">
              <StatBlock label="Chosen releases" value={selectedSourceCount} />
              <StatBlock label="Preview included" value={preview?.selected_count ?? 0} />
              <StatBlock label="Duplicates" value={preview?.duplicate_release_ids.length ?? 0} muted />
            </div>

            {preview && (
              <>
                <div className="review-summary">
                  <span>Workflow: {workflowMode}</span>
                  <span>
                    {preview.selected_count} included · {preview.retained_count} not included
                  </span>
                  <span>{preview.blocking_conflicts.length} blocking issue(s)</span>
                </div>

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

                <div className="review-table-header">
                  <div className="section-label">Included release review</div>
                  <div className="history-strip">
                    <button
                      className={`history-pill${reviewTableMode === "selected" ? " active" : ""}`}
                      onClick={() => setReviewTableMode("selected")}
                    >
                      Selected only
                    </button>
                    <button
                      className={`history-pill${reviewTableMode === "all" ? " active" : ""}`}
                      onClick={() => setReviewTableMode("all")}
                    >
                      All source rows
                    </button>
                  </div>
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
                        <th>Review state</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="empty-cell">
                            No rows available for this review mode.
                          </td>
                        </tr>
                      )}
                      {reviewItems.map((item) => {
                        const isPreviewSelected = previewSelectedIds.has(item.id);
                        const isExplicitlySelected = selectedSourceIdSet.has(item.id);
                        const isDuplicate = duplicateReleaseIds.has(item.release_id);
                        return (
                          <tr
                            key={item.id}
                            className={isPreviewSelected ? "row-selected" : undefined}
                          >
                            <td>{item.artist}</td>
                            <td>{item.title}</td>
                            <td>{item.folder_name ?? `Folder ${item.folder_id}`}</td>
                            <td>{item.release_id}</td>
                            <td>{formatDate(item.date_added)}</td>
                            <td>
                              <div className="preview-state">
                                <span className={`state-pill${isPreviewSelected ? " active" : ""}`}>
                                  {isPreviewSelected ? "Included" : isExplicitlySelected ? "Chosen" : "Not chosen"}
                                </span>
                                {isDuplicate && <span className="state-pill warning">Duplicate</span>}
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

            {!preview && (
              <div className="empty-block">
                Use the source table to choose releases, then generate a preview here. This step
                will summarize what gets copied or moved, highlight duplicates, and show any
                conflicts you need to clear before launch.
              </div>
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
  if (options.length === 0) {
    return <div className="empty-block compact">No values available in the synced source snapshot.</div>;
  }

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

function FilterBlock({
  label,
  description,
  children,
  onRemove,
}: {
  label: string;
  description: string;
  children: ReactNode;
  onRemove(): void;
}) {
  return (
    <article className="filter-block">
      <div className="filter-block-header">
        <div>
          <div className="field-label">{label}</div>
          <p className="filter-block-copy">{description}</p>
        </div>
        <button className="text-btn filter-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
      {children}
    </article>
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

function SourceSelectionSection({
  title,
  snapshot,
  items,
  totalSourceItems,
  selectedCount,
  selectedItemIds,
  onToggleSelect,
  onSelectAllVisible,
  onDeselectVisible,
  onClearSelection,
}: {
  title: string;
  snapshot: CollectionSnapshot | null;
  items: CollectionItemSnapshot[];
  totalSourceItems: number;
  selectedCount: number;
  selectedItemIds: Set<string>;
  onToggleSelect(itemId: string): void;
  onSelectAllVisible(): void;
  onDeselectVisible(): void;
  onClearSelection(): void;
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
    { key: "folder", label: "Folder" },
    { key: "genre", label: "Genre / style" },
    { key: "label", label: "Label / format" },
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
          <div className="section-label">Step 2</div>
          <h2>{title}</h2>
        </div>
        <div className="header-note">
          {snapshot
            ? `${selectedCount} selected · ${totalItems} visible of ${totalSourceItems}`
            : "No local snapshot"}
        </div>
      </div>

      <div className="selection-toolbar">
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
            {totalItems === 0 ? "0 visible rows" : `Showing ${pageStart}-${pageEnd} of ${totalItems}`}
          </div>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost" onClick={onSelectAllVisible} disabled={items.length === 0}>
            Select all filtered
          </button>
          <button className="btn btn-ghost" onClick={onDeselectVisible} disabled={items.length === 0}>
            Deselect filtered
          </button>
          <button className="btn btn-ghost" onClick={onClearSelection} disabled={selectedCount === 0}>
            Clear all
          </button>
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

      <div className={tableWrapClassName}>
        <table className="data-table snapshot-table selection-table">
          <colgroup>
            <col className="selection-col-pick" />
            <col className="snapshot-col-artist" />
            <col className="snapshot-col-title" />
            <col className="snapshot-col-folder" />
            <col className="snapshot-col-genre" />
            <col className="snapshot-col-label" />
            <col className="snapshot-col-added" />
          </colgroup>
          <thead>
            <tr>
              <th className="selection-column">Pick</th>
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
            {!snapshot && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Sync the source account to populate the local snapshot.
                </td>
              </tr>
            )}
            {snapshot && items.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  No rows match the current search and optional filters.
                </td>
              </tr>
            )}
            {paginatedItems.map((item) => {
              const isSelected = selectedItemIds.has(item.id);
              return (
                <tr key={item.id} className={isSelected ? "row-selected" : undefined}>
                  <td>
                    <label className="row-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                      />
                      <span>{isSelected ? "Selected" : "Choose"}</span>
                    </label>
                  </td>
                  <td>{item.artist}</td>
                  <td>{item.title}</td>
                  <td>{item.folder_name ?? item.folder_id}</td>
                  <td>{formatGenreStyle(item)}</td>
                  <td>{formatLabelFormat(item)}</td>
                  <td>{formatDate(item.date_added)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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
          <div className="section-label">Destination</div>
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
  activeFilterKeys: FilterKey[];
  specificDate: string;
  dateFrom: string;
  dateTo: string;
  artistQuery: string;
  titleQuery: string;
  labelQuery: string;
  genreQuery: string;
  formatQuery: string;
  styleQuery: string;
  selectedFolderIds: number[];
  selectedGenres: string[];
  selectedLabels: string[];
  selectedFormats: string[];
  selectedStyles: string[];
}): SelectionFilters {
  const hasSpecificDate = input.activeFilterKeys.includes("specific_date");
  const hasDateRange = input.activeFilterKeys.includes("date_range");

  return {
    date_from: hasSpecificDate
      ? input.specificDate
        ? startOfDayIso(input.specificDate)
        : null
      : hasDateRange && input.dateFrom
        ? toIsoDateTime(input.dateFrom)
        : null,
    date_to: hasSpecificDate
      ? input.specificDate
        ? endOfDayIso(input.specificDate)
        : null
      : hasDateRange && input.dateTo
        ? toIsoDateTime(input.dateTo)
        : null,
    artist_query: input.activeFilterKeys.includes("artist_search")
      ? input.artistQuery.trim() || null
      : null,
    title_query: input.activeFilterKeys.includes("title_search")
      ? input.titleQuery.trim() || null
      : null,
    label_query: input.activeFilterKeys.includes("label_search")
      ? input.labelQuery.trim() || null
      : null,
    genre_query: input.activeFilterKeys.includes("genre_search")
      ? input.genreQuery.trim() || null
      : null,
    format_query: input.activeFilterKeys.includes("format_search")
      ? input.formatQuery.trim() || null
      : null,
    style_query: input.activeFilterKeys.includes("style_search")
      ? input.styleQuery.trim() || null
      : null,
    folder_ids: input.activeFilterKeys.includes("folders") ? input.selectedFolderIds : [],
    genres: input.activeFilterKeys.includes("genres") ? input.selectedGenres : [],
    labels: input.activeFilterKeys.includes("labels") ? input.selectedLabels : [],
    formats: input.activeFilterKeys.includes("formats") ? input.selectedFormats : [],
    styles: input.activeFilterKeys.includes("styles") ? input.selectedStyles : [],
    year_min: null,
    year_max: null,
    rating_min: null,
    manual_include_snapshot_item_ids: [],
    manual_exclude_snapshot_item_ids: [],
    text_query: null,
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
  key: "genres" | "labels" | "formats" | "styles",
) {
  const values = new Set<string>();
  for (const item of items) {
    for (const entry of item[key]) {
      if (entry) values.add(entry);
    }
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right));
}

function filterSourceItems(items: CollectionItemSnapshot[], filters: SelectionFilters) {
  const normalizedGenres = new Set(filters.genres.map((value) => value.toLowerCase()));
  const normalizedLabels = new Set(filters.labels.map((value) => value.toLowerCase()));
  const normalizedFormats = new Set(filters.formats.map((value) => value.toLowerCase()));
  const normalizedStyles = new Set(filters.styles.map((value) => value.toLowerCase()));
  const artistQuery = filters.artist_query?.trim().toLowerCase();
  const titleQuery = filters.title_query?.trim().toLowerCase();
  const labelQuery = filters.label_query?.trim().toLowerCase();
  const genreQuery = filters.genre_query?.trim().toLowerCase();
  const formatQuery = filters.format_query?.trim().toLowerCase();
  const styleQuery = filters.style_query?.trim().toLowerCase();
  const legacyQuery = filters.text_query?.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.date_from) {
      if (!item.date_added || new Date(item.date_added).getTime() < new Date(filters.date_from).getTime()) {
        return false;
      }
    }
    if (filters.date_to) {
      if (!item.date_added || new Date(item.date_added).getTime() > new Date(filters.date_to).getTime()) {
        return false;
      }
    }
    if (filters.folder_ids.length > 0 && !filters.folder_ids.includes(item.folder_id)) {
      return false;
    }
    if (
      normalizedGenres.size > 0 &&
      !item.genres.some((value) => normalizedGenres.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (
      normalizedLabels.size > 0 &&
      !item.labels.some((value) => normalizedLabels.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (
      normalizedFormats.size > 0 &&
      !item.formats.some((value) => normalizedFormats.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (
      normalizedStyles.size > 0 &&
      !item.styles.some((value) => normalizedStyles.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (artistQuery && !item.artist.toLowerCase().includes(artistQuery)) {
      return false;
    }
    if (titleQuery && !item.title.toLowerCase().includes(titleQuery)) {
      return false;
    }
    if (labelQuery && !item.labels.some((value) => value.toLowerCase().includes(labelQuery))) {
      return false;
    }
    if (genreQuery && !item.genres.some((value) => value.toLowerCase().includes(genreQuery))) {
      return false;
    }
    if (formatQuery && !item.formats.some((value) => value.toLowerCase().includes(formatQuery))) {
      return false;
    }
    if (styleQuery && !item.styles.some((value) => value.toLowerCase().includes(styleQuery))) {
      return false;
    }
    if (legacyQuery) {
      const haystack = [
        item.artist,
        item.title,
        item.folder_name ?? String(item.folder_id),
        item.labels.join(" "),
        item.genres.join(" "),
        item.formats.join(" "),
        item.styles.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(legacyQuery)) {
        return false;
      }
    }
    return true;
  });
}

function deriveLoadedFilterState(filters: SelectionFilters) {
  const activeFilterKeys: FilterKey[] = [];
  let specificDate = "";
  let dateFrom = "";
  let dateTo = "";

  const derivedSpecificDate = tryDeriveSpecificDate(filters.date_from, filters.date_to);
  if (derivedSpecificDate) {
    activeFilterKeys.push("specific_date");
    specificDate = derivedSpecificDate;
  } else if (filters.date_from || filters.date_to) {
    activeFilterKeys.push("date_range");
    dateFrom = toDateTimeLocalValue(filters.date_from);
    dateTo = toDateTimeLocalValue(filters.date_to);
  }

  if ((filters.genres ?? []).length > 0) activeFilterKeys.push("genres");
  if ((filters.labels ?? []).length > 0) activeFilterKeys.push("labels");
  if ((filters.formats ?? []).length > 0) activeFilterKeys.push("formats");
  if ((filters.styles ?? []).length > 0) activeFilterKeys.push("styles");
  if ((filters.folder_ids ?? []).length > 0) activeFilterKeys.push("folders");
  if (filters.artist_query) activeFilterKeys.push("artist_search");
  if (filters.title_query) activeFilterKeys.push("title_search");
  if (filters.label_query) activeFilterKeys.push("label_search");
  if (filters.genre_query) activeFilterKeys.push("genre_search");
  if (filters.format_query) activeFilterKeys.push("format_search");
  if (filters.style_query) activeFilterKeys.push("style_search");

  return {
    activeFilterKeys,
    specificDate,
    dateFrom,
    dateTo,
    artistQuery: filters.artist_query ?? "",
    titleQuery: filters.title_query ?? "",
    labelQuery: filters.label_query ?? "",
    genreQuery: filters.genre_query ?? "",
    formatQuery: filters.format_query ?? "",
    styleQuery: filters.style_query ?? "",
  };
}

function tryDeriveSpecificDate(dateFrom?: string | null, dateTo?: string | null) {
  if (!dateFrom || !dateTo) return "";
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
  const sameDay =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth() &&
    from.getUTCDate() === to.getUTCDate();
  return sameDay ? from.toISOString().slice(0, 10) : "";
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
      message: "The review step will unlock once both source and destination snapshots are available.",
    } as const;
  }
  if (selectedSourceCount === 0) {
    return {
      tone: "warning",
      title: "Select at least one release",
      message: "Use the source table checkboxes or bulk-select all filtered rows before generating a preview.",
    } as const;
  }
  if (!preview) {
    return {
      tone: "default",
      title: "Generate a preview",
      message: "Validate duplicates, folder mappings, and destination capabilities before launching the job.",
    } as const;
  }
  if (previewIsStale) {
    return {
      tone: "warning",
      title: "Preview is stale",
      message: "Your search, filters, selections, or workflow changed. Generate a fresh preview before launch.",
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
    message: "The selected releases have been reviewed. Launch the job when you are satisfied with this preview.",
  } as const;
}

function appendUnique(current: string[], nextValues: string[]) {
  const seen = new Set(current);
  const merged = [...current];
  for (const value of nextValues) {
    if (seen.has(value)) continue;
    seen.add(value);
    merged.push(value);
  }
  return merged;
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

function formatGenreStyle(item: CollectionItemSnapshot) {
  const genre = item.genres[0] ?? "—";
  const style = item.styles[0];
  return style ? `${genre} · ${style}` : genre;
}

function formatLabelFormat(item: CollectionItemSnapshot) {
  const label = item.labels[0] ?? "—";
  const format = item.formats[0];
  return format ? `${label} · ${format}` : label;
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
      return item.genres[0] ?? item.styles[0] ?? null;
    case "label":
      return item.labels[0] ?? item.formats[0] ?? null;
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

function startOfDayIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function endOfDayIso(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}
