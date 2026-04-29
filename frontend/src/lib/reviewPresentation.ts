import type {
  CollectionSnapshot,
  ConnectedAccount,
  PreviewResponse,
  ReviewState,
} from "./types";

export function deriveReviewState({
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
}): ReviewState {
  const accountsReady = Boolean(
    sourceAccount && destinationAccount && sourceSnapshot,
  );
  const selectionReady = selectedSourceCount > 0;
  const previewReady = Boolean(preview) && !previewIsStale;
  const blockerCount = preview?.blocking_conflicts.length ?? 0;
  const blockersCleared = previewReady && blockerCount === 0;

  const checklist = [
    {
      label: "Both accounts connected",
      status: accountsReady ? "done" : "blocked",
    },
    {
      label: selectionReady ? "Items selected" : "No items selected",
      status: !accountsReady ? "attention" : selectionReady ? "done" : "blocked",
    },
    {
      label: "Preview ready",
      status: !accountsReady || !selectionReady
        ? "attention"
        : previewReady
          ? "done"
          : "blocked",
    },
  ] as const;

  if (!accountsReady) {
    return {
      tone: "default",
      title: "Connect both accounts",
      message:
        "Sync the account you're moving from and connect the account you're moving to before you preview this migration.",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (!selectionReady) {
    return {
      tone: "warning",
      title: "Select releases to include",
      message:
        "Choose at least one release from the account you're moving from before you generate a preview.",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (!preview) {
    return {
      tone: "default",
      title: "Generate a preview",
      message:
        "Check duplicates, mappings, and what already exists in the receiving account before you start the migration.",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (previewIsStale) {
    return {
      tone: "warning",
      title: "Preview out of date",
      message: "Your filters or mappings changed. Refresh the preview before you start.",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (blockerCount > 0) {
    return {
      tone: "warning",
      title: "Resolve blockers before launch",
      message: `Resolve ${blockerCount} blocker${blockerCount !== 1 ? "s" : ""} before you launch the migration.`,
      blockerCount,
      checklist: [...checklist],
    };
  }
  return {
    tone: "ready",
    title: "Ready to launch",
    message: "Your preview is current and blockers are cleared.",
    blockerCount: 0,
    checklist: [...checklist],
  };
}

export function getReviewCapabilityIntro() {
  return {
    title: "What carries over",
    message: "Use this to confirm what will transfer before you start.",
  };
}

export function getReviewBlockersTitle(blockerCount: number): string {
  if (blockerCount > 1) {
    return `Resolve before launch (${blockerCount})`;
  }
  return "Resolve before launch";
}

export function getReviewBlockersRefreshCue(): string {
  return "After updating any blocker, refresh preview to confirm these issues are cleared.";
}

export function getReviewSummaryStaleMessage({
  selectedSourceCount,
  previewSelectedCount,
}: {
  selectedSourceCount: number;
  previewSelectedCount: number;
}): string {
  if (selectedSourceCount !== previewSelectedCount) {
    return `Preview is out of date. Last preview included ${previewSelectedCount} release${previewSelectedCount !== 1 ? "s" : ""}; ${selectedSourceCount} ${selectedSourceCount !== 1 ? "are" : "is"} now selected. Refresh preview.`;
  }

  return "Preview is out of date. Filters or mappings changed since the last preview. Refresh preview.";
}

export function getReviewCustomFieldConflictTitle(fieldName: string): string {
  return `Map source field "${fieldName}"`;
}

export function getReviewCustomFieldConflictBody(fieldName: string): string {
  return `This source field is not mapped in the destination yet. Enter the destination field name for "${fieldName}", or keep the same name on both sides.`;
}

export function getReviewFolderConflictTitle(folderName: string): string {
  return `Choose destination folder for "${folderName}"`;
}

export function getReviewFolderConflictBody(folderName: string, reason?: string): string {
  if (reason === "missing_destination_folder") {
    return `The destination account has no folder named "${folderName}". Choose the destination folder this source folder should map to.`;
  }
  return `The destination account has more than one folder named "${folderName}". Choose the folder this source folder should map to.`;
}

export function getReviewEvidenceDescription(mode: "selected" | "all"): string {
  if (mode === "selected") {
    return "Spot-check the rows included in this preview.";
  }
  return "Compare the preview against the wider filtered source rows.";
}
