import { useCallback, useEffect, useMemo, useState } from "react";
import {
  appendUnique,
  filterSourceItems,
  sanitizeStringMap,
} from "../lib/filters";
import type {
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
  MigrationPlanPreviewRequest,
  SelectionFilters,
  WorkflowMode,
} from "../lib/types";

export function useMigrationPlan({
  sourceAccount,
  destinationAccount,
  sourceSnapshot,
  sourceItems,
  filters,
}: {
  sourceAccount?: ConnectedAccount;
  destinationAccount?: ConnectedAccount;
  sourceSnapshot: CollectionSnapshot | null;
  sourceItems: CollectionItemSnapshot[];
  filters: SelectionFilters;
}) {
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("copy");
  const [selectedSourceItemIds, setSelectedSourceItemIds] = useState<string[]>(
    [],
  );
  const [folderMappingOverrides, setFolderMappingOverrides] = useState<
    Record<string, number>
  >({});
  const [customFieldMappingOverrides, setCustomFieldMappingOverrides] =
    useState<Record<string, string>>({});

  // Prune stale selection IDs when sourceItems changes
  useEffect(() => {
    const validSourceIds = new Set(sourceItems.map((item) => item.id));
    setSelectedSourceItemIds((current) =>
      current.filter((itemId) => validSourceIds.has(itemId)),
    );
  }, [sourceItems]);

  const currentPlan = useMemo<MigrationPlanPreviewRequest>(
    () => ({
      source_account_id: sourceAccount?.id ?? "",
      destination_account_id: destinationAccount?.id ?? "",
      snapshot_id: sourceSnapshot?.id ?? "",
      selected_snapshot_item_ids: selectedSourceItemIds,
      workflow_mode: workflowMode,
      name: "Untitled plan",
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
      filters,
      folderMappingOverrides,
      customFieldMappingOverrides,
    ],
  );

  const currentPlanSignature = useMemo(
    () => JSON.stringify(currentPlan),
    [currentPlan],
  );

  const filteredSourceItems = useMemo(
    () => filterSourceItems(sourceItems, filters),
    [sourceItems, filters],
  );
  const filteredSourceItemIds = useMemo(
    () => filteredSourceItems.map((item) => item.id),
    [filteredSourceItems],
  );
  const selectedSourceIdSet = useMemo(
    () => new Set(selectedSourceItemIds),
    [selectedSourceItemIds],
  );
  const selectedSourceCount = selectedSourceItemIds.length;

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

  return {
    workflowMode,
    setWorkflowMode,
    selectedSourceItemIds,
    setSelectedSourceItemIds,
    folderMappingOverrides,
    customFieldMappingOverrides,
    currentPlan,
    currentPlanSignature,
    filteredSourceItems,
    filteredSourceItemIds,
    selectedSourceIdSet,
    selectedSourceCount,
    toggleSourceSelection,
    selectFilteredItems,
    selectSourceRange,
    deselectFilteredItems,
    clearSelectedItems,
    setFolderOverride,
    setCustomFieldOverride,
  };
}
