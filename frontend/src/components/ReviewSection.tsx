import { useVirtualizer } from "@tanstack/react-virtual";
import { Play, ScanEye } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { formatDate, renderCapabilityChips } from "../lib/format";
import {
  getReviewBlockersRefreshCue,
  getReviewBlockersTitle,
  getReviewCapabilityIntro,
  getReviewCustomFieldConflictBody,
  getReviewCustomFieldConflictTitle,
  getReviewEvidenceDescription,
  getReviewFolderConflictBody,
  getReviewFolderConflictTitle,
  getReviewSummaryStaleMessage,
} from "../lib/reviewPresentation";
import type {
  CollectionItemSnapshot,
  PreviewConflict,
  PreviewResponse,
  ReviewState,
} from "../lib/types";

export function ReviewSection({
  isGeneratingPreview,
  onGeneratePreview,
  isCreatingJob,
  launchBlocked,
  onLaunchJob,
  reviewState,
  selectedSourceCount,
  preview,
  previewIsStale,
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
  previewIsStale: boolean;
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

  const capabilityChips = preview
    ? renderCapabilityChips(preview.metadata_capabilities)
    : [];
  const capabilityIntro = getReviewCapabilityIntro();
  const evidenceDescription = getReviewEvidenceDescription(reviewTableMode);
  const hasPreview = Boolean(preview);
  const shouldShowReadyCapabilities =
    hasPreview && capabilityChips.length > 0 && reviewState.tone === "ready";
  const shouldShowStandaloneCapabilities =
    hasPreview && capabilityChips.length > 0 && reviewState.tone !== "ready";
  const shouldShowMetrics = selectedSourceCount > 0 || hasPreview;
  const duplicateCount = preview?.duplicate_release_ids.length ?? 0;
  const reviewSummaryStaleMessage = previewIsStale && preview
    ? getReviewSummaryStaleMessage({
        selectedSourceCount,
        previewSelectedCount: preview.selected_count,
      })
    : null;

  function handleToggle() {
    setCollapsed((c) => !c);
  }

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
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
      <div className="canvas-header canvas-header-shell">
        <button
          type="button"
          className="canvas-header-toggle"
          aria-expanded={!collapsed}
          onClick={handleToggle}
          onKeyDown={handleHeaderKeyDown}
        >
          <span
            className={`section-collapse-icon${collapsed ? " collapsed" : ""}`}
            aria-hidden="true"
          />
          <div className="canvas-header-title">
            <h2>Preview and start</h2>
          </div>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className={`review-head-grid${shouldShowReadyCapabilities ? "" : " is-single"}`}>
            <section className={`review-summary review-summary-${reviewState.tone}`}>
              <div className="review-summary-head">
                <div className="review-summary-copy-block">
                  <div className="review-summary-title-row">
                    <h3>{reviewState.title}</h3>
                  </div>
                  <p className="review-summary-message">{reviewState.message}</p>
                </div>
                <div className="review-summary-actions">
                  <button
                    className="btn btn-ghost"
                    disabled={isGeneratingPreview}
                    onClick={onGeneratePreview}
                  >
                    <ScanEye size={14} />
                    {isGeneratingPreview ? "Checking…" : hasPreview ? "Refresh preview" : "Generate preview"}
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={launchBlocked || isCreatingJob}
                    onClick={onLaunchJob}
                  >
                    <Play size={14} />
                    {isCreatingJob ? "Starting…" : "Start migration"}
                  </button>
                </div>
              </div>

              {shouldShowMetrics && (
                <div className="summary-strip review-summary-strip">
                  <ReviewSummaryStat
                    label="Selected now"
                    value={selectedSourceCount}
                  />
                  <ReviewSummaryStat
                    label="In last preview"
                    value={preview?.selected_count ?? 0}
                  />
                  <ReviewSummaryStat
                    label="Already in receiving account"
                    value={duplicateCount}
                    quiet={duplicateCount === 0}
                    attention={duplicateCount > 0}
                  />
                </div>
              )}

              {reviewSummaryStaleMessage && (
                <p className="review-summary-stale">{reviewSummaryStaleMessage}</p>
              )}

              <div className="review-checklist-block">
                <div className="review-checklist" aria-label="Migration readiness checklist">
                  {reviewState.checklist.map((item) => (
                    <span
                      key={item.label}
                      className={`review-checklist-item review-checklist-item-${item.status}`}
                    >
                      <span className="review-checklist-dot" aria-hidden="true" />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {shouldShowReadyCapabilities && (
              <section className="review-capabilities">
                <div className="review-capabilities-copy">
                  <h3>{capabilityIntro.title}</h3>
                  <p className="review-evidence-copy">
                    {capabilityIntro.message}
                  </p>
                </div>
                <div className="review-capability-list">
                  {capabilityChips.map((chip) => (
                    <div
                      key={chip.label}
                      className={`review-capability-card review-capability-card-${toneForCapability(chip.value)}`}
                      title={chip.note}
                    >
                      <div className="review-capability-meta">
                        <span className="review-capability-label">{chip.label}</span>
                        <span className="review-capability-value">{chip.value}</span>
                      </div>
                      {chip.note && (
                        <p className="review-capability-note">{chip.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {shouldShowStandaloneCapabilities && (
            <section className="review-capabilities">
              <div className="review-capabilities-copy">
                <h3>{capabilityIntro.title}</h3>
                <p className="review-evidence-copy">
                  {capabilityIntro.message}
                </p>
              </div>
              <div className="review-capability-list">
                {capabilityChips.map((chip) => (
                  <div
                    key={chip.label}
                    className={`review-capability-card review-capability-card-${toneForCapability(chip.value)}`}
                    title={chip.note}
                  >
                    <div className="review-capability-meta">
                      <span className="review-capability-label">{chip.label}</span>
                      <span className="review-capability-value">{chip.value}</span>
                    </div>
                    {chip.note && (
                      <p className="review-capability-note">{chip.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {preview && (
            <>
              {preview.blocking_conflicts.length > 0 && (
                <section className="review-blockers">
                  <div className="review-blockers-head">
                    <div>
                      <h3>{getReviewBlockersTitle(reviewState.blockerCount)}</h3>
                    </div>
                  </div>
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
                  <div className="header-note review-blockers-note review-blockers-refresh-note">
                    {getReviewBlockersRefreshCue()}
                  </div>
                </section>
              )}

              <div
                className="review-table-header is-toggle"
                role="button"
                tabIndex={0}
                aria-expanded={!tableCollapsed}
                onClick={handleTableToggle}
                onKeyDown={handleTableHeaderKeyDown}
              >
                <div className="review-evidence-head">
                  <div>
                    <h3>Preview rows</h3>
                    <p className="review-evidence-copy">{evidenceDescription}</p>
                  </div>
                  <div
                    className="history-strip"
                    onClick={(event) => event.stopPropagation()}
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
                      All filtered rows
                    </button>
                  </div>
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
                        <th>From folder</th>
                        <th>Release</th>
                        <th>Added</th>
                        <th>Preview status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="empty-cell">
                            No rows available in this view.
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
                        const isPreviewSelected = previewSelectedIds.has(item.id);
                        const isExplicitlySelected = selectedSourceIdSet.has(item.id);
                        const isDuplicate = duplicateReleaseIds.has(item.release_id);
                        const primaryState = isPreviewSelected
                          ? "Included in preview"
                          : isExplicitlySelected
                            ? "Chosen, not included"
                            : "Comparison only";
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
                                  {primaryState}
                                </span>
                                {isDuplicate && (
                                  <span className="state-pill warning">
                                    Already in receiving account
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

          {!preview && isGeneratingPreview && (
            <div className="empty-block preview-loading">
              <span className="preview-loading-label">
                Checking selections against receiving account…
              </span>
              <div className="preview-loading-bars">
                <span className="skeleton-cell skeleton-cell-long" />
                <span className="skeleton-cell skeleton-cell-mid" />
                <span className="skeleton-cell skeleton-cell-short" />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function toneForCapability(value: string): "ready" | "attention" | "blocked" {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("not ") ||
    normalized.includes("cannot") ||
    normalized.includes("missing")
  ) {
    return "blocked";
  }
  if (
    normalized.includes("best effort") ||
    normalized.includes("partial") ||
    normalized.includes("skip")
  ) {
    return "attention";
  }
  return "ready";
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
      <div className="conflict-card-type">Folder mapping</div>
      <h3>{getReviewFolderConflictTitle(folderName)}</h3>
      <p>{getReviewFolderConflictBody(folderName)}</p>
      <select
        aria-label={`Map ${folderName} to receiving folder`}
        value={selectedValue ? String(selectedValue) : ""}
        onChange={(event) =>
          onChange(
            sourceFolderId,
            event.target.value ? Number(event.target.value) : null,
          )
        }
      >
        <option value="">Choose receiving folder</option>
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
      <div className="conflict-card-type">Custom field</div>
      <h3>{getReviewCustomFieldConflictTitle(fieldName)}</h3>
      <p>{getReviewCustomFieldConflictBody(fieldName)}</p>
      <div className="inline-action">
        <input
          type="text"
          aria-label={`Receiving account field name for ${fieldName}`}
          placeholder="Receiving account field name"
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

function ReviewSummaryStat({
  label,
  value,
  quiet = false,
  attention = false,
}: {
  label: string;
  value: number;
  quiet?: boolean;
  attention?: boolean;
}) {
  return (
    <div
      className={`stat-block review-summary-stat${quiet ? " is-quiet" : ""}${attention ? " is-attention" : ""}`}
    >
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
