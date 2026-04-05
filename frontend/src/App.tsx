import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRightLeft,
  Bookmark,
  Copy,
  Link,
  RefreshCw,
  Trash2,
  Unlink,
} from "lucide-react";

import { JobConsoleSection } from "./components/JobConsoleSection";
import { ReviewSection } from "./components/ReviewSection";
import { SnapshotSection } from "./components/SnapshotSection";
import { SourceSelectionSection } from "./components/SourceSelectionSection";
import { Field, FilterBlock, PillSelect, StatBlock } from "./components/ui";
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
import { formatJobStatus, formatSyncDateTime } from "./lib/format";
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
  const [sourceSnapshot, setSourceSnapshot] =
    useState<CollectionSnapshot | null>(null);
  const [sourceItems, setSourceItems] = useState<CollectionItemSnapshot[]>([]);
  const [destinationSnapshot, setDestinationSnapshot] =
    useState<CollectionSnapshot | null>(null);
  const [destinationItems, setDestinationItems] = useState<
    CollectionItemSnapshot[]
  >([]);
  const [status, setStatus] = useState("Connecting to local backend…");
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    fetched: number;
    total: number | null;
  } | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [lastPreviewSignature, setLastPreviewSignature] = useState<
    string | null
  >(null);
  const [reviewTableMode, setReviewTableMode] = useState<"selected" | "all">(
    "selected",
  );
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
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedSourceItemIds, setSelectedSourceItemIds] = useState<string[]>(
    [],
  );
  const [folderMappingOverrides, setFolderMappingOverrides] = useState<
    Record<string, number>
  >({});
  const [customFieldMappingOverrides, setCustomFieldMappingOverrides] =
    useState<Record<string, string>>({});

  const sourceAccount = accounts.find((account) => account.role === "source");
  const destinationAccount = accounts.find(
    (account) => account.role === "destination",
  );

  const filters = useMemo(
    () =>
      buildFilters({
        activeFilterKeys,
        specificDate,
        dateFrom,
        dateTo,
        artistQuery,
        titleQuery,
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
      custom_field_mapping_overrides: sanitizeStringMap(
        customFieldMappingOverrides,
      ),
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
  const currentPlanSignature = useMemo(
    () => JSON.stringify(currentPlan),
    [currentPlan],
  );
  const previewIsStale = Boolean(
    preview && lastPreviewSignature !== currentPlanSignature,
  );

  const previewSelectedIds = useMemo(
    () => new Set(preview?.selected_items.map((item) => item.id) ?? []),
    [preview],
  );
  const duplicateReleaseIds = useMemo(
    () => new Set(preview?.duplicate_release_ids ?? []),
    [preview],
  );
  const selectedSourceIdSet = useMemo(
    () => new Set(selectedSourceItemIds),
    [selectedSourceItemIds],
  );
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

  const folderOptions = useMemo(
    () => deriveFolderOptions(sourceItems),
    [sourceItems],
  );
  const genreOptions = useMemo(
    () => deriveStringOptions(sourceItems, "genres"),
    [sourceItems],
  );
  const labelOptions = useMemo(
    () => deriveStringOptions(sourceItems, "labels"),
    [sourceItems],
  );
  const formatOptions = useMemo(
    () => deriveStringOptions(sourceItems, "formats"),
    [sourceItems],
  );
  const styleOptions = useMemo(
    () => deriveStringOptions(sourceItems, "styles"),
    [sourceItems],
  );
  const destinationFolderLookup = useMemo(
    () => deriveFolderLookup(destinationItems),
    [destinationItems],
  );
  const recentJobs = jobs.filter((j) => j.status !== "draft").slice(0, 8);
  const previewConflicts = preview?.blocking_conflicts ?? [];
  const folderConflicts = previewConflicts.filter(
    (conflict) => conflict.type === "folder_mapping",
  );
  const customFieldConflicts = previewConflicts.filter(
    (conflict) => conflict.type === "custom_field_mapping",
  );
  const availableFilterOptions = useMemo(
    () =>
      FILTER_OPTIONS.filter((option) => {
        if (activeFilterKeys.includes(option.key)) return false;
        if (
          option.key === "specific_date" &&
          activeFilterKeys.includes("date_range")
        )
          return false;
        if (
          option.key === "date_range" &&
          activeFilterKeys.includes("specific_date")
        )
          return false;
        return true;
      }),
    [activeFilterKeys],
  );
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

  useEffect(() => {
    const validSourceIds = new Set(sourceItems.map((item) => item.id));
    setSelectedSourceItemIds((current) =>
      current.filter((itemId) => validSourceIds.has(itemId)),
    );
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
          : (jobList[0]?.id ?? null);
      setSelectedJobId(nextSelectedJobId);
      if (!nextSelectedJobId) {
        setJobDetail(null);
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load state.",
      );
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
      startTransition(() => {
        setJobDetail(detail);
      });
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to load job detail.",
      );
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

  async function handleConnect(role: "source" | "destination") {
    const popup = window.open(
      "",
      `discogs-oauth-${role}`,
      "popup=yes,width=960,height=720",
    );
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
      setStatus(
        `OAuth started for ${role}. Finish the callback flow in the opened window.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OAuth start failed.";
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
          setSyncProgress({
            fetched: progress.fetched ?? 0,
            total: progress.total ?? null,
          });
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
    if (launchBlocked || isCreatingJob) return;
    setIsCreatingJob(true);
    try {
      const detail = await api.createJob({ plan: currentPlan });
      setJobDetail(detail);
      setSelectedJobId(detail.job.id);
      setStatus(`Job started.`);
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
      const result = await api.exportJob(jobId);
      setStatus("Reports exported — folder opened in Finder.");
      void result;
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
      return withoutConflicts.includes(key)
        ? withoutConflicts
        : [...withoutConflicts, key];
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
    setSelectedSourceItemIds((current) =>
      appendUnique(current, filteredSourceItemIds),
    );
  }, [filteredSourceItemIds]);

  const selectSourceRange = useCallback((itemIds: string[]) => {
    setSelectedSourceItemIds((current) => appendUnique(current, itemIds));
  }, []);

  const deselectFilteredItems = useCallback(() => {
    const visibleIds = new Set(filteredSourceItemIds);
    setSelectedSourceItemIds((current) =>
      current.filter((itemId) => !visibleIds.has(itemId)),
    );
  }, [filteredSourceItemIds]);

  const clearSelectedItems = useCallback(() => {
    setSelectedSourceItemIds([]);
  }, []);

  function setFolderOverride(
    sourceFolderId: string,
    destinationFolderId: number | null,
  ) {
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
            label="Artist"
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
            label="Title"
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
      case "genres":
        return (
          <FilterBlock
            key={key}
            label="Genres"
            onRemove={() => removeFilter(key)}
          >
            <PillSelect
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
            onRemove={() => removeFilter(key)}
          >
            <PillSelect
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
            onRemove={() => removeFilter(key)}
          >
            <PillSelect
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
            onRemove={() => removeFilter(key)}
          >
            <PillSelect
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
            onRemove={() => removeFilter(key)}
          >
            <PillSelect
              options={folderOptions.map((o) => o.label)}
              values={folderOptions
                .filter((o) => selectedFolderIds.includes(o.id))
                .map((o) => o.label)}
              onChange={(labels) =>
                setSelectedFolderIds(
                  folderOptions
                    .filter((o) => labels.includes(o.label))
                    .map((o) => o.id),
                )
              }
              ariaLabel="Filter by folder"
            />
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
            <span
              className={`status-dot${loading ? " status-dot-busy" : ""}`}
            />
            {loading
              ? "Refreshing workspace"
              : `Backend online${accounts.length > 0 ? ` · ${accounts.length} account${accounts.length !== 1 ? "s" : ""}` : ""}`}
          </span>
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
        <aside className="shell-left">
          <section className="rail-section">
            <div
              className="rail-section-header"
              role="button"
              tabIndex={0}
              aria-expanded={!accountsCollapsed}
              onClick={() => setAccountsCollapsed((c) => !c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setAccountsCollapsed((c) => !c);
                }
              }}
            >
              <h2 className="section-label">Accounts</h2>
              <span
                className={`section-collapse-icon${accountsCollapsed ? " collapsed" : ""}`}
                aria-hidden="true"
              />
            </div>
            {!accountsCollapsed && (
              <>
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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPlannerCollapsed((c) => !c);
                }
              }}
            >
              <div>
                <div className="section-label">Step 1</div>
                <h2 className="editorial-title">Build the source view</h2>
              </div>
              <span
                className={`section-collapse-icon${plannerCollapsed ? " collapsed" : ""}`}
                aria-hidden="true"
              />
            </div>

            {!plannerCollapsed && (
              <>
                <div className="field-stack">
                  <Field label="Workflow mode">
                    <div className="toggle-group">
                      <button
                        className={`toggle-option${workflowMode === "copy" ? " active" : ""}`}
                        onClick={() => setWorkflowMode("copy")}
                      >
                        <Copy size={13} />
                        Copy only
                      </button>
                      <button
                        className={`toggle-option${workflowMode === "move" ? " active" : ""}`}
                        onClick={() => setWorkflowMode("move")}
                      >
                        <ArrowRightLeft size={13} />
                        Two-phase move
                      </button>
                    </div>
                  </Field>

                  <Field label="Plan name">
                    <input
                      type="text"
                      value={planName}
                      onChange={(event) => setPlanName(event.target.value)}
                    />
                  </Field>
                </div>

                <div className="planner-footer">
                  <div className="stats-line">
                    <StatBlock
                      label="Selected releases"
                      value={selectedSourceCount}
                      small
                    />
                    <StatBlock
                      label="Source total"
                      value={sourceItems.length}
                      muted
                      small
                    />
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
                    {activeFilterKeys.map(renderFilterBlock)}
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
            onLaunchJob={() => void handleCreateJob()}
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
      <article className="credit-card credit-card-empty">
        <span className={`role-chip role-${role}`}>{role}</span>
        <div className="credit-name credit-name-empty">
          Authorize {role} account
        </div>
        <p className="credit-meta">
          Connect the {role} Discogs account to populate local snapshots.
        </p>
        <button className="btn btn-primary" onClick={() => onConnect(role)}>
          <Link size={14} />
          Connect account
        </button>
      </article>
    );
  }

  return (
    <article className="credit-card">
      <span className={`role-chip role-${role}`}>{role}</span>
      <div className="credit-name">{account.username}</div>
      <div className="account-status">
        {syncing ? (
          <span className="credit-meta">
            {syncProgress
              ? `Fetching ${syncProgress.fetched.toLocaleString()} / ${syncProgress.total != null ? syncProgress.total.toLocaleString() : "…"} releases…`
              : "Syncing…"}
          </span>
        ) : account.last_synced_at ? (
          <>
            <span className="credit-meta">
              Synced {formatSyncDateTime(account.last_synced_at)}
            </span>
            <span className="credit-count">
              {itemCount.toLocaleString()} items
            </span>
          </>
        ) : (
          <span className="credit-meta">Connected, not yet synced</span>
        )}
      </div>
      <div className="inline-button-row">
        <button
          className="btn btn-primary"
          disabled={syncing}
          onClick={() => onSync(account.id)}
        >
          <RefreshCw size={14} />
          {syncing ? "Syncing…" : "Sync collection"}
        </button>
        <button
          className="btn btn-ghost"
          disabled={syncing}
          onClick={() => onDisconnect(account.id)}
        >
          <Unlink size={14} />
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
