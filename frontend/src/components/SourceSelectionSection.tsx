import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { formatDate } from "../lib/format";
import {
  sortSnapshotItems,
  type SnapshotSortColumn,
  type SnapshotSortDirection,
} from "../lib/sort";
import type { CollectionItemSnapshot, CollectionSnapshot } from "../lib/types";

const SOURCE_COLUMNS: Array<{ key: SnapshotSortColumn; label: string }> = [
  { key: "artist", label: "Artist" },
  { key: "title", label: "Title" },
  { key: "genre", label: "Genre" },
  { key: "style", label: "Style" },
  { key: "label", label: "Label" },
  { key: "format", label: "Format" },
  { key: "added", label: "Added" },
];

export const SourceSelectionSection = memo(function SourceSelectionSection({
  title,
  snapshot,
  items,
  totalSourceItems,
  selectedCount,
  selectedItemIds,
  loading,
  onToggleSelect,
  onSelectRange,
  onSelectAllVisible,
  onDeselectVisible,
  onClearSelection,
  filterControls,
}: {
  title: string;
  snapshot: CollectionSnapshot | null;
  items: CollectionItemSnapshot[];
  totalSourceItems: number;
  selectedCount: number;
  selectedItemIds: Set<string>;
  loading: boolean;
  onToggleSelect(itemId: string): void;
  onSelectRange(itemIds: string[]): void;
  onSelectAllVisible(): void;
  onDeselectVisible(): void;
  onClearSelection(): void;
  filterControls?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [sortColumn, setSortColumn] = useState<SnapshotSortColumn | null>(null);
  const [sortDirection, setSortDirection] =
    useState<SnapshotSortDirection>("asc");
  const lastInteractedItemIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedItems = useMemo(
    () => sortSnapshotItems(items, sortColumn, sortDirection),
    [items, sortColumn, sortDirection],
  );
  const totalItems = sortedItems.length;
  const columns = SOURCE_COLUMNS;

  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => scrollRef.current,
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
    if (
      !sortedItems.some((item) => item.id === lastInteractedItemIdRef.current)
    ) {
      lastInteractedItemIdRef.current = null;
    }
  }, [sortedItems]);

  function handleItemInteraction(itemId: string, withRange: boolean) {
    if (withRange && lastInteractedItemIdRef.current) {
      const startIndex = sortedItems.findIndex(
        (item) => item.id === lastInteractedItemIdRef.current,
      );
      const endIndex = sortedItems.findIndex((item) => item.id === itemId);

      if (startIndex >= 0 && endIndex >= 0) {
        const [fromIndex, toIndex] =
          startIndex < endIndex
            ? [startIndex, endIndex]
            : [endIndex, startIndex];
        onSelectRange(
          sortedItems.slice(fromIndex, toIndex + 1).map((item) => item.id),
        );
        lastInteractedItemIdRef.current = itemId;
        return;
      }
    }

    onToggleSelect(itemId);
    lastInteractedItemIdRef.current = itemId;
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    itemId: string,
  ) {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    handleItemInteraction(itemId, event.shiftKey);
  }

  function handleToggle() {
    setCollapsed((c) => !c);
  }

  function handleHeaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  }

  return (
    <section className={`canvas-section${collapsed ? " is-collapsed" : ""}`}>
      <div
        className="canvas-header is-toggle"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={handleToggle}
        onKeyDown={handleHeaderKeyDown}
      >
        <div>
          <h2>{title}</h2>
        </div>
        <div className="canvas-header-right">
          <div className="header-note">
            {snapshot
              ? `${selectedCount} selected · ${totalItems} visible of ${totalSourceItems}`
              : "No local snapshot"}
          </div>
          <span
            className={`section-collapse-icon${collapsed ? " collapsed" : ""}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {!collapsed && (
        <>
          {filterControls && (
            <div className="source-filter-zone">{filterControls}</div>
          )}
          <div className="selection-toolbar">
            <div className="snapshot-controls">
              <div className="header-note">
                {totalItems === 0
                  ? "0 visible rows"
                  : `${totalItems} visible row${totalItems === 1 ? "" : "s"}`}
              </div>
            </div>
            <div className="toolbar-actions">
              <button
                className="btn btn-ghost"
                onClick={onSelectAllVisible}
                disabled={items.length === 0}
              >
                Select all filtered
              </button>
              <button
                className="btn btn-ghost"
                onClick={onDeselectVisible}
                disabled={items.length === 0}
              >
                Deselect filtered
              </button>
              <button
                className="btn btn-ghost"
                onClick={onClearSelection}
                disabled={selectedCount === 0}
              >
                Clear all
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="table-wrap snapshot-frame-wrap">
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
                      <th
                        key={column.key}
                        aria-sort={
                          isActive
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
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
                {!snapshot &&
                  (loading ? (
                    Array.from({ length: 8 }, (_, i) => (
                      <tr key={i} className="skeleton-row">
                        <td />
                        <td>
                          <span className="skeleton-cell skeleton-cell-long" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-long" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-mid" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-mid" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-mid" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-mid" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-short" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="empty-cell">
                        Sync the source account to populate the local snapshot.
                      </td>
                    </tr>
                  ))}
                {snapshot && items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No rows match the current search and optional filters.
                    </td>
                  </tr>
                )}
                {sortedItems.length > 0 && paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="virt-spacer"
                      style={{ height: paddingTop }}
                    />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const item = sortedItems[virtualRow.index];
                  const isSelected = selectedItemIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`snapshot-selectable-row${isSelected ? " row-selected" : ""}`}
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={(event) =>
                        handleItemInteraction(item.id, event.shiftKey)
                      }
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
                {sortedItems.length > 0 && paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="virt-spacer"
                      style={{ height: paddingBottom }}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
});
