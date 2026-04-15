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
      label: "Items selected",
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
    {
      label: "All requirements met",
      status: !previewReady
        ? "attention"
        : blockersCleared
          ? "done"
          : "blocked",
    },
  ] as const;

  if (!accountsReady) {
    return {
      tone: "default",
      title: "Connect both accounts",
      message:
        "Sync your source and connect the destination before you review this migration.",
      launchLabel: "Not ready",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (!selectionReady) {
    return {
      tone: "warning",
      title: "Select releases to include",
      message: "Choose at least one source row before you generate a preview.",
      launchLabel: "Selection required",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (!preview) {
    return {
      tone: "default",
      title: "Generate a preview",
      message: "Check duplicates, mappings, and destination behavior before launch.",
      launchLabel: "Preview required",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (previewIsStale) {
    return {
      tone: "warning",
      title: "Preview out of date",
      message: "Your filters or workflow changed. Refresh the preview before launch.",
      launchLabel: "Refresh preview",
      blockerCount: 1,
      checklist: [...checklist],
    };
  }
  if (blockerCount > 0) {
    return {
      tone: "warning",
      title: "Resolve blockers before launch",
      message: `Resolve ${blockerCount} blocker${blockerCount !== 1 ? "s" : ""} before you start the migration.`,
      launchLabel: "Resolve blockers",
      blockerCount,
      checklist: [...checklist],
    };
  }
  return {
    tone: "ready",
    title: "Ready to launch",
    message: "Your preview is current and blockers are cleared.",
    launchLabel: "Ready",
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

export function getReviewBlockersTitle(): string {
  return "Resolve before launch";
}

export function getReviewBlockersMessage(): string {
  return "This preview found setup issues that need your input before migration can start.";
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

export function getReviewFolderConflictBody(folderName: string): string {
  return `The destination account has more than one folder named "${folderName}". Choose the folder this source folder should map to.`;
}

export function getReviewEvidenceDescription(mode: "selected" | "all"): string {
  if (mode === "selected") {
    return "Spot-check the rows included in this preview.";
  }
  return "Compare the preview against the wider filtered source rows.";
}
