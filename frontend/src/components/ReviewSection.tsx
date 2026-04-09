import { useVirtualizer } from "@tanstack/react-virtual";
import { Play, ScanEye } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { formatDate, renderCapabilityChips } from "../lib/format";
import type {
  CollectionItemSnapshot,
  PreviewConflict,
  PreviewResponse,
  ReviewState,
} from "../lib/types";
import { StatBlock } from "./ui";

export function ReviewSection({
  isGeneratingPreview,
  onGeneratePreview,
  isCreatingJob,
  launchBlocked,
  onLaunchJob,
  reviewState,
  selectedSourceCount,
  preview,
  previewSelectedIds,
  duplicateReleaseIds,
  folderConflicts,
  customFieldConflicts,
  destinationFolderLookup,
  folderMappingOverrides,
  customFieldMappingOverrides,
  onFolderOverride,
  onCustomFieldOverride,
  reviewTableMode,
  onReviewTableModeChange,
  reviewItems,
  selectedSourceIdSet,
}: {
  isGeneratingPreview: boolean;
  onGeneratePreview(): void;
  isCreatingJob: boolean;
  launchBlocked: boolean;
  onLaunchJob(): void;
  reviewState: ReviewState;
  selectedSourceCount: number;
  preview: PreviewResponse | null;
  previewSelectedIds: Set<string>;
  duplicateReleaseIds: Set<number>;
  folderConflicts: PreviewConflict[];
  customFieldConflicts: PreviewConflict[];
  destinationFolderLookup: Record<number, string>;
  folderMappingOverrides: Record<string, number>;
  customFieldMappingOverrides: Record<string, string>;
  onFolderOverride(
    sourceFolderId: string,
    destinationFolderId: number | null,
  ): void;
  onCustomFieldOverride(fieldName: string, destinationField: string): void;
  reviewTableMode: "selected" | "all";
  onReviewTableModeChange(mode: "selected" | "all"): void;
  reviewItems: CollectionItemSnapshot[];
  selectedSourceIdSet: Set<string>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: reviewItems.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop =
    virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  function handleToggle() {
    setCollapsed((c) => !c);
  }

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  }

  function handleTableToggle() {
    setTableCollapsed((c) => !c);
  }

  function handleTableHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTableToggle();
    }
  }

  return (
    <section
      className={`canvas-section canvas-section-review${collapsed ? " is-collapsed" : ""}`}
    >
      <div
        className="canvas-header is-toggle"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={handleToggle}
        onKeyDown={handleHeaderKeyDown}
      >
        <div>
          <h2>Review and launch</h2>
        </div>
        <div className="canvas-header-right">
          <div className="toolbar-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost"
              disabled={isGeneratingPreview}
              onClick={onGeneratePreview}
            >
              <ScanEye size={14} />
              {isGeneratingPreview ? "Checking…" : "Generate preview"}
            </button>
            <button
              className="btn btn-primary"
              disabled={launchBlocked || isCreatingJob}
              onClick={onLaunchJob}
            >
              <Play size={14} />
              {isCreatingJob ? "Launching…" : "Launch job"}
            </button>
          </div>
          <span
            className={`section-collapse-icon${collapsed ? " collapsed" : ""}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {!collapsed && (
        <>
          <div className={`review-status review-status-${reviewState.tone}`}>
            <strong>{reviewState.title}</strong>
            {" — "}
            {reviewState.message}
          </div>

          <div className="summary-strip">
            <StatBlock label="Chosen releases" value={selectedSourceCount} />
            <StatBlock
              label="Preview included"
              value={preview?.selected_count ?? 0}
            />
            <StatBlock
              label="Duplicates"
              value={preview?.duplicate_release_ids.length ?? 0}
              muted
            />
          </div>

          {preview && (
            <>
              {preview.blocking_conflicts.length > 0 && (
                <div className="conflict-grid">
                  {folderConflicts.map((conflict) => (
                    <FolderConflictCard
                      key={`folder-${String(conflict.payload.source_folder_id)}`}
                      conflict={conflict}
                      destinationFolderLookup={destinationFolderLookup}
                      selectedValue={
                        folderMappingOverrides[
                          String(conflict.payload.source_folder_id)
                        ] ?? null
                      }
                      onChange={onFolderOverride}
                    />
                  ))}
                  {customFieldConflicts.map((conflict) => (
                    <CustomFieldConflictCard
                      key={`field-${String(conflict.payload.field_name)}`}
                      conflict={conflict}
                      value={
                        customFieldMappingOverrides[
                          String(conflict.payload.field_name)
                        ] ?? ""
                      }
                      onChange={onCustomFieldOverride}
                    />
                  ))}
                </div>
              )}

              <div className="section-label">Job behavior</div>
              <div className="capability-row">
                {renderCapabilityChips(preview.metadata_capabilities).map(
                  (chip) => (
                    <span
                      key={chip.label}
                      className="capability-chip"
                      title={chip.note}
                    >
                      {chip.label} · {chip.value}
                    </span>
                  ),
                )}
              </div>

              <div
                className="review-table-header is-toggle"
                role="button"
                tabIndex={0}
                aria-expanded={!tableCollapsed}
                onClick={handleTableToggle}
                onKeyDown={handleTableHeaderKeyDown}
              >
                <h3 className="section-label">Included release review</h3>
                <div
                  className="history-strip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={`history-pill${reviewTableMode === "selected" ? " active" : ""}`}
                    onClick={() => onReviewTableModeChange("selected")}
                  >
                    Selected only
                  </button>
                  <button
                    className={`history-pill${reviewTableMode === "all" ? " active" : ""}`}
                    onClick={() => onReviewTableModeChange("all")}
                  >
                    All source rows
                  </button>
                </div>
                <span
                  className={`section-collapse-icon${tableCollapsed ? " collapsed" : ""}`}
                  aria-hidden="true"
                />
              </div>

              {!tableCollapsed && (
                <div
                  ref={tableScrollRef}
                  className="table-wrap table-wrap-tall"
                >
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
                      {reviewItems.length > 0 && paddingTop > 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="virt-spacer"
                            style={{ height: paddingTop }}
                          />
                        </tr>
                      )}
                      {virtualItems.map((virtualRow) => {
                        const item = reviewItems[virtualRow.index];
                        const isPreviewSelected = previewSelectedIds.has(
                          item.id,
                        );
                        const isExplicitlySelected = selectedSourceIdSet.has(
                          item.id,
                        );
                        const isDuplicate = duplicateReleaseIds.has(
                          item.release_id,
                        );
                        return (
                          <tr
                            key={item.id}
                            className={
                              isPreviewSelected ? "row-selected" : undefined
                            }
                          >
                            <td>{item.artist}</td>
                            <td>{item.title}</td>
                            <td>
                              {item.folder_name ?? `Folder ${item.folder_id}`}
                            </td>
                            <td>{item.release_id}</td>
                            <td>{formatDate(item.date_added)}</td>
                            <td>
                              <div className="preview-state">
                                <span
                                  className={`state-pill${isPreviewSelected ? " active" : ""}`}
                                >
                                  {isPreviewSelected
                                    ? "Included"
                                    : isExplicitlySelected
                                      ? "Chosen"
                                      : "Not chosen"}
                                </span>
                                {isDuplicate && (
                                  <span className="state-pill warning">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {reviewItems.length > 0 && paddingBottom > 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="virt-spacer"
                            style={{ height: paddingBottom }}
                          />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {!preview && (
            <div
              className={`empty-block${isGeneratingPreview ? " preview-loading" : ""}`}
            >
              {isGeneratingPreview ? (
                <>
                  <span className="preview-loading-label">
                    Checking selections against destination…
                  </span>
                  <div className="preview-loading-bars">
                    <span className="skeleton-cell skeleton-cell-long" />
                    <span className="skeleton-cell skeleton-cell-mid" />
                    <span className="skeleton-cell skeleton-cell-short" />
                  </div>
                </>
              ) : (
                "Use the source table to choose releases, then generate a preview here. This step will summarize what gets copied or moved, highlight duplicates, and show any conflicts you need to clear before launch."
              )}
            </div>
          )}
        </>
      )}
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
  const destinationFolderIds = Array.isArray(
    conflict.payload.destination_folder_ids,
  )
    ? conflict.payload.destination_folder_ids.map((value) => Number(value))
    : [];

  return (
    <article className="conflict-card">
      <div className="section-label">Folder mapping</div>
      <h3>{folderName}</h3>
      <p>{conflict.message}</p>
      <select
        aria-label={`Map ${folderName} to destination folder`}
        value={selectedValue ? String(selectedValue) : ""}
        onChange={(event) =>
          onChange(
            sourceFolderId,
            event.target.value ? Number(event.target.value) : null,
          )
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
      <p>
        This source field doesn't have a matching field in the destination.
        Enter the destination field name to map it, or use the same name.
      </p>
      <div className="inline-action">
        <input
          type="text"
          aria-label={`Destination field name for ${fieldName}`}
          placeholder={`e.g. ${fieldName}`}
          value={value}
          onChange={(event) => onChange(fieldName, event.target.value)}
        />
        <button
          className="btn btn-ghost"
          onClick={() => onChange(fieldName, fieldName)}
        >
          Use same name
        </button>
      </div>
    </article>
  );
}
