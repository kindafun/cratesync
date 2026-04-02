import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { JobConsoleSection } from "./components/JobConsoleSection";
import { ReviewSection } from "./components/ReviewSection";
import { SnapshotSection } from "./components/SnapshotSection";
import { SourceSelectionSection } from "./components/SourceSelectionSection";
import { Field, FilterBlock, MultiValueSelect, StatBlock } from "./components/ui";
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
import { formatDateTime, formatJobStatus } from "./lib/format";
import { renderOAuthPopup, type OAuthCompleteMessage } from "./lib/oauth";
import type {
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
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ fetched: number; total: number | null } | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [lastPreviewSignature, setLastPreviewSignature] = useState<string | null>(null);
  const [nextFilterToAdd, setNextFilterToAdd] = useState<FilterKey | "">("");
  const [reviewTableMode, setReviewTableMode] = useState<"selected" | "all">("selected");
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);
  const [accountsCollapsed, setAccountsCollapsed] = useState(false);
  const [plannerCollapsed, setPlannerCollapsed] = useState(false);

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
    setRetryFn(null);
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
      setRetryFn(() => () => void refreshWorkspace());
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

  const savedViewsRef = useRef<HTMLDetailsElement>(null);
  const handlePreviewRef = useRef(handlePreview);
  handlePreviewRef.current = handlePreview;

  useEffect(() => {
    void refreshWorkspace();
  }, []);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && savedViewsRef.current?.open) {
        savedViewsRef.current.open = false;
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "g") {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        void handlePreviewRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (jobDetail && ACTIVE_JOB_STATUSES.includes(jobDetail.job.status)) {
      document.title = `${formatJobStatus(jobDetail.job.status)} · ${jobDetail.job.name} · CrateSync`;
    } else if (isSyncing !== null) {
      document.title = "Syncing… · CrateSync";
    } else {
      document.title = "CrateSync";
    }
  }, [jobDetail, isSyncing]);

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
    setRetryFn(null);
    setIsSyncing(accountId);
    setSyncProgress(null);
    try {
      await api.syncCollection(accountId);
      while (true) {
        await new Promise<void>((resolve) => setTimeout(resolve, 800));
        const progress = await api.getSyncProgress(accountId);
        if (progress.status === "error") {
          throw new Error(progress.error ?? "Sync failed.");
        }
        if (progress.status === "running") {
          setSyncProgress({ fetched: progress.fetched ?? 0, total: progress.total ?? null });
        }
        if (progress.status === "done") break;
      }
      await refreshWorkspace();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed.");
      setRetryFn(() => () => void handleSync(accountId));
    } finally {
      setIsSyncing(null);
      setSyncProgress(null);
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
              aria-label="Specific date"
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
              aria-label="Artist name"
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
              aria-label="Release title"
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
              aria-label="Label name"
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
              aria-label="Genre"
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
              aria-label="Format"
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
              aria-label="Style"
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
              ariaLabel="Filter by genre"
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
              ariaLabel="Filter by label"
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
              ariaLabel="Filter by format"
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
              ariaLabel="Filter by style"
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
              aria-label="Filter by folder"
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
            {loading
              ? "Refreshing workspace"
              : `Backend online${accounts.length > 0 ? ` · ${accounts.length} account${accounts.length !== 1 ? "s" : ""}` : ""}`}
          </span>
          <button className="text-btn text-btn-danger" onClick={() => void handleClearLocalData()}>
            Clear local data
          </button>
        </div>
      </header>

      <section className="shell-grid">
        <aside className="shell-left">
          <div className="left-hero">
            <h1 className="hero-title">Migration control</h1>
            <p className="lead-copy">
              Filter the source view only when needed, explicitly pick the releases to migrate, and
              use the review step to confirm exactly what will happen before launch.
            </p>
          </div>

          <section className="rail-section">
            <div
              className="rail-section-header"
              role="button"
              tabIndex={0}
              aria-expanded={!accountsCollapsed}
              onClick={() => setAccountsCollapsed((c) => !c)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAccountsCollapsed((c) => !c); }}}
            >
              <h2 className="section-label">Accounts</h2>
              <span className={`section-collapse-icon${accountsCollapsed ? " collapsed" : ""}`} aria-hidden="true" />
            </div>
            {!accountsCollapsed && (
            <>
            {retryFn && (
              <div className="error-banner">
                <span>{status}</span>
                <button className="btn btn-ghost btn-sm" onClick={retryFn}>Try again</button>
              </div>
            )}
            <AccountCard
              role="source"
              account={sourceAccount}
              itemCount={sourceSnapshot?.total_items ?? 0}
              syncing={isSyncing === sourceAccount?.id}
              syncProgress={isSyncing === sourceAccount?.id ? syncProgress : null}
              onConnect={handleConnect}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
            <AccountCard
              role="destination"
              account={destinationAccount}
              itemCount={destinationSnapshot?.total_items ?? 0}
              syncing={isSyncing === destinationAccount?.id}
              syncProgress={isSyncing === destinationAccount?.id ? syncProgress : null}
              onConnect={handleConnect}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
            </>
            )}
          </section>

          <section className="rail-section">
            <div
              className="rail-section-header"
              role="button"
              tabIndex={0}
              aria-expanded={!plannerCollapsed}
              onClick={() => setPlannerCollapsed((c) => !c)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlannerCollapsed((c) => !c); }}}
            >
              <div>
                <div className="section-label">Step 1</div>
                <h2 className="editorial-title">Build the source view</h2>
              </div>
              <span className={`section-collapse-icon${plannerCollapsed ? " collapsed" : ""}`} aria-hidden="true" />
            </div>

            <details className="saved-views-menu" ref={savedViewsRef}>
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

            {!plannerCollapsed && (
            <>
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
                    No filters active — all source releases are in scope. Add only the search or
                    metadata fields you need.
                  </div>
                )}

                <div className="filter-list">{activeFilterKeys.map(renderFilterBlock)}</div>

                {availableFilterOptions.length > 0 && (
                  <div className="filter-add-row">
                    <select
                      aria-label="Select filter to add"
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
                <StatBlock label="Selected releases" value={selectedSourceCount} small />
                <StatBlock label="Visible after filters" value={filteredSourceItems.length} small />
                <StatBlock label="Source total" value={sourceItems.length} muted small />
              </div>
            </div>
            </>
            )}
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
            loading={loading || isSyncing !== null}
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
            loading={loading || isSyncing !== null}
          />

          <ReviewSection
            isGeneratingPreview={isGeneratingPreview}
            onGeneratePreview={() => void handlePreview()}
            launchBlocked={launchBlocked}
            onLaunchJob={() => void handleCreateJob()}
            reviewState={reviewState}
            selectedSourceCount={selectedSourceCount}
            preview={preview}
            workflowMode={workflowMode}
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
      <article className="credit-card credit-card-empty">
        <span className={`role-chip role-${role}`}>{role}</span>
        <div className="credit-name credit-name-empty">Authorize {role} account</div>
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
        {syncing
          ? syncProgress
            ? `Fetching ${syncProgress.fetched.toLocaleString()} / ${syncProgress.total != null ? syncProgress.total.toLocaleString() : "…"} releases…`
            : "Syncing…"
          : account.last_synced_at
            ? `Synced ${formatDateTime(account.last_synced_at)} · ${itemCount} items`
            : "Connected, not yet synced"}
      </p>
      <div className="inline-button-row">
        <button className="btn btn-primary" disabled={syncing} onClick={() => onSync(account.id)}>
          {syncing ? "Syncing…" : "Sync collection"}
        </button>
        <button className="btn btn-ghost" disabled={syncing} onClick={() => onDisconnect(account.id)}>
          Disconnect
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
