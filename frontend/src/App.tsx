import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { API_ORIGINS, api } from "./lib/api";
import {
  EMPTY_FILTERS,
  FILTER_OPTIONS,
  appendUnique,
  buildFilters,
  deriveLoadedFilterState,
  deriveFolderLookup,
  deriveFolderOptions,
  deriveStringOptions,
  filterSourceItems,
  sanitizeStringMap,
  type FilterKey,
} from "./lib/filters";
import { formatDate, formatDateTime, formatJobStatus, renderCapabilities, statusTone } from "./lib/format";
import { renderOAuthPopup, type OAuthCompleteMessage } from "./lib/oauth";
import { sortSnapshotItems, type SnapshotSortColumn, type SnapshotSortDirection } from "./lib/sort";
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

  const filters = useMemo(
    () =>
      buildFilters({
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
      }),
    [
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
    ],
  );

  const currentPlan = useMemo<MigrationPlanPreviewRequest>(
    () => ({
      source_account_id: sourceAccount?.id ?? "",
      destination_account_id: destinationAccount?.id ?? "",
      snapshot_id: sourceSnapshot?.id ?? "",
      selected_snapshot_item_ids: selectedSourceItemIds,
      workflow_mode: workflowMode,
      name: planName.trim() || "Untitled plan",
      filters,
      folder_mapping_overrides: folderMappingOverrides,
      custom_field_mapping_overrides: sanitizeStringMap(customFieldMappingOverrides),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sourceAccount?.id,
      destinationAccount?.id,
      sourceSnapshot?.id,
      selectedSourceItemIds,
      workflowMode,
      planName,
      filters,
      folderMappingOverrides,
      customFieldMappingOverrides,
    ],
  );
  const currentPlanSignature = useMemo(() => JSON.stringify(currentPlan), [currentPlan]);
  const previewIsStale = Boolean(preview && lastPreviewSignature !== currentPlanSignature);

  const previewSelectedIds = useMemo(
    () => new Set(preview?.selected_items.map((item) => item.id) ?? []),
    [preview],
  );
  const duplicateReleaseIds = useMemo(
    () => new Set(preview?.duplicate_release_ids ?? []),
    [preview],
  );
  const selectedSourceIdSet = useMemo(() => new Set(selectedSourceItemIds), [selectedSourceItemIds]);
  const filteredSourceItems = useMemo(
    () => filterSourceItems(sourceItems, filters),
    [sourceItems, filters],
  );
  const filteredSourceItemIds = useMemo(
    () => filteredSourceItems.map((item) => item.id),
    [filteredSourceItems],
  );
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

  const folderOptions = useMemo(() => deriveFolderOptions(sourceItems), [sourceItems]);
  const genreOptions = useMemo(() => deriveStringOptions(sourceItems, "genres"), [sourceItems]);
  const labelOptions = useMemo(() => deriveStringOptions(sourceItems, "labels"), [sourceItems]);
  const formatOptions = useMemo(() => deriveStringOptions(sourceItems, "formats"), [sourceItems]);
  const styleOptions = useMemo(() => deriveStringOptions(sourceItems, "styles"), [sourceItems]);
  const destinationFolderLookup = useMemo(() => deriveFolderLookup(destinationItems), [destinationItems]);
  const recentJobs = jobs.slice(0, 8);
  const previewConflicts = preview?.blocking_conflicts ?? [];
  const folderConflicts = previewConflicts.filter((conflict) => conflict.type === "folder_mapping");
  const customFieldConflicts = previewConflicts.filter(
    (conflict) => conflict.type === "custom_field_mapping",
  );
  const availableFilterOptions = useMemo(
    () =>
      FILTER_OPTIONS.filter((option) => {
        if (activeFilterKeys.includes(option.key)) return false;
        if (option.key === "specific_date" && activeFilterKeys.includes("date_range")) return false;
        if (option.key === "date_range" && activeFilterKeys.includes("specific_date")) return false;
        return true;
      }),
    [activeFilterKeys],
  );
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

  const toggleSourceSelection = useCallback((itemId: string) => {
    setSelectedSourceItemIds((current) =>
      current.includes(itemId)
        ? current.filter((value) => value !== itemId)
        : [...current, itemId],
    );
  }, []);

  const selectFilteredItems = useCallback(() => {
    setSelectedSourceItemIds((current) => appendUnique(current, filteredSourceItemIds));
  }, [filteredSourceItemIds]);

  const selectSourceRange = useCallback((itemIds: string[]) => {
    setSelectedSourceItemIds((current) => appendUnique(current, itemIds));
  }, []);

  const deselectFilteredItems = useCallback(() => {
    const visibleIds = new Set(filteredSourceItemIds);
    setSelectedSourceItemIds((current) => current.filter((itemId) => !visibleIds.has(itemId)));
  }, [filteredSourceItemIds]);

  const clearSelectedItems = useCallback(() => {
    setSelectedSourceItemIds([]);
  }, []);

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
            onSelectRange={selectSourceRange}
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
              {recentJobs.length === 0 && <span className="text-muted text-meta">No jobs created yet.</span>}
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

const SOURCE_COLUMNS: Array<{ key: SnapshotSortColumn; label: string }> = [
  { key: "artist", label: "Artist" },
  { key: "title", label: "Title" },
  { key: "genre", label: "Genre" },
  { key: "style", label: "Style" },
  { key: "label", label: "Label" },
  { key: "format", label: "Format" },
  { key: "added", label: "Added" },
];

const SourceSelectionSection = memo(function SourceSelectionSection({
  title,
  snapshot,
  items,
  totalSourceItems,
  selectedCount,
  selectedItemIds,
  onToggleSelect,
  onSelectRange,
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
  onSelectRange(itemIds: string[]): void;
  onSelectAllVisible(): void;
  onDeselectVisible(): void;
  onClearSelection(): void;
}) {
  const [sortColumn, setSortColumn] = useState<SnapshotSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SnapshotSortDirection>("asc");
  const lastInteractedItemIdRef = useRef<string | null>(null);

  const sortedItems = useMemo(
    () => sortSnapshotItems(items, sortColumn, sortDirection),
    [items, sortColumn, sortDirection],
  );
  const totalItems = sortedItems.length;
  const columns = SOURCE_COLUMNS;

  function handleSort(nextColumn: SnapshotSortColumn) {
    if (sortColumn === nextColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(nextColumn);
    setSortDirection("asc");
  }

  useEffect(() => {
    if (!lastInteractedItemIdRef.current) return;
    if (!sortedItems.some((item) => item.id === lastInteractedItemIdRef.current)) {
      lastInteractedItemIdRef.current = null;
    }
  }, [sortedItems]);

  function handleItemInteraction(itemId: string, withRange: boolean) {
    if (withRange && lastInteractedItemIdRef.current) {
      const startIndex = sortedItems.findIndex((item) => item.id === lastInteractedItemIdRef.current);
      const endIndex = sortedItems.findIndex((item) => item.id === itemId);

      if (startIndex >= 0 && endIndex >= 0) {
        const [fromIndex, toIndex] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        onSelectRange(sortedItems.slice(fromIndex, toIndex + 1).map((item) => item.id));
        lastInteractedItemIdRef.current = itemId;
        return;
      }
    }

    onToggleSelect(itemId);
    lastInteractedItemIdRef.current = itemId;
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, itemId: string) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    handleItemInteraction(itemId, event.shiftKey);
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
          <div className="header-note">
            {totalItems === 0
              ? "0 visible rows"
              : totalItems > 25
                ? `25 rows visible · scroll for ${totalItems - 25} more`
                : `${totalItems} visible row${totalItems === 1 ? "" : "s"}`}
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

      <div className="table-wrap snapshot-frame-wrap">
        <table className="data-table snapshot-table selection-table">
          <colgroup>
            <col className="selection-col-choose" />
            <col className="snapshot-col-artist" />
            <col className="snapshot-col-title" />
            <col className="snapshot-col-genre" />
            <col className="snapshot-col-style" />
            <col className="snapshot-col-label" />
            <col className="snapshot-col-format" />
            <col className="snapshot-col-added" />
          </colgroup>
          <thead>
            <tr>
              <th className="selection-column" aria-label="Select rows" />
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
                <td colSpan={8} className="empty-cell">
                  Sync the source account to populate the local snapshot.
                </td>
              </tr>
            )}
            {snapshot && items.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No rows match the current search and optional filters.
                </td>
              </tr>
            )}
            {sortedItems.map((item) => {
              const isSelected = selectedItemIds.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`snapshot-selectable-row${isSelected ? " row-selected" : ""}`}
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={(event) => handleItemInteraction(item.id, event.shiftKey)}
                  onKeyDown={(event) => handleRowKeyDown(event, item.id)}
                >
                  <td>
                    <label className="row-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        aria-hidden="true"
                        readOnly
                        tabIndex={-1}
                      />
                    </label>
                  </td>
                  <td>{item.artist}</td>
                  <td>{item.title}</td>
                  <td>{item.genres[0] ?? "—"}</td>
                  <td>{item.styles[0] ?? "—"}</td>
                  <td>{item.labels[0] ?? "—"}</td>
                  <td>{item.formats[0] ?? "—"}</td>
                  <td>{formatDate(item.date_added)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
});

const SNAPSHOT_COLUMNS: Array<{ key: SnapshotSortColumn; label: string }> = [
  { key: "artist", label: "Artist" },
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
  { key: "genre", label: "Genre" },
  { key: "label", label: "Label" },
  { key: "added", label: "Added" },
];

const SnapshotSection = memo(function SnapshotSection({
  title,
  snapshot,
  items,
}: {
  title: string;
  snapshot: CollectionSnapshot | null;
  items: CollectionItemSnapshot[];
}) {
  const [sortColumn, setSortColumn] = useState<SnapshotSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SnapshotSortDirection>("asc");

  const sortedItems = useMemo(
    () => sortSnapshotItems(items, sortColumn, sortDirection),
    [items, sortColumn, sortDirection],
  );
  const totalItems = sortedItems.length;
  const columns = SNAPSHOT_COLUMNS;

  function handleSort(nextColumn: SnapshotSortColumn) {
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
          <div className="header-note">
            {totalItems === 0
              ? "0 items"
              : totalItems > 25
                ? `25 rows visible · scroll for ${totalItems - 25} more`
                : `${totalItems} item${totalItems === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>
      <div className="table-wrap snapshot-frame-wrap">
        <table className="data-table snapshot-table">
          <colgroup>
            <col className="snapshot-col-artist" />
            <col className="snapshot-col-title" />
            <col className="snapshot-col-year" />
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
                <td colSpan={6} className="empty-cell">
                  Sync this account to populate the local snapshot.
                </td>
              </tr>
            )}
            {sortedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.artist}</td>
                <td>{item.title}</td>
                <td>{item.year ?? "—"}</td>
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
});

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

