import { memo, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { formatDate, formatDateTime } from "../lib/format";
import {
  sortSnapshotItems,
  type SnapshotSortColumn,
  type SnapshotSortDirection,
} from "../lib/sort";
import type { CollectionItemSnapshot, CollectionSnapshot } from "../lib/types";

const SNAPSHOT_COLUMNS: Array<{ key: SnapshotSortColumn; label: string }> = [
  { key: "artist", label: "Artist" },
  { key: "title", label: "Title" },
  { key: "year", label: "Year" },
  { key: "genre", label: "Genre" },
  { key: "label", label: "Label" },
  { key: "added", label: "Added" },
];

export const SnapshotSection = memo(function SnapshotSection({
  title,
  snapshot,
  items,
  loading,
}: {
  title: string;
  snapshot: CollectionSnapshot | null;
  items: CollectionItemSnapshot[];
  loading: boolean;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [sortColumn, setSortColumn] = useState<SnapshotSortColumn | null>(null);
  const [sortDirection, setSortDirection] =
    useState<SnapshotSortDirection>("asc");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedItems = useMemo(
    () => sortSnapshotItems(items, sortColumn, sortDirection),
    [items, sortColumn, sortDirection],
  );
  const totalItems = sortedItems.length;
  const columns = SNAPSHOT_COLUMNS;

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

  function handleToggle() {
    setCollapsed((c) => !c);
  }

  function handleKeyDown(event: KeyboardEvent) {
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
        onKeyDown={handleKeyDown}
      >
        <div>
          <div className="section-label">Destination</div>
          <h2>{title}</h2>
        </div>
        <div className="canvas-header-right">
          <div className="header-note">
            {snapshot
              ? `${snapshot.total_items} items · synced ${formatDateTime(snapshot.created_at)}`
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
          <div className="snapshot-toolbar">
            <div className="snapshot-controls">
              <div className="header-note">
                {totalItems === 0
                  ? "0 items"
                  : `${totalItems} item${totalItems === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
          <div ref={scrollRef} className="table-wrap snapshot-frame-wrap">
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
                {items.length === 0 &&
                  (loading ? (
                    Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} className="skeleton-row">
                        <td>
                          <span className="skeleton-cell skeleton-cell-long" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-long" />
                        </td>
                        <td>
                          <span className="skeleton-cell skeleton-cell-short" />
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
                      <td colSpan={6} className="empty-cell">
                        Sync this account to populate the local snapshot.
                      </td>
                    </tr>
                  ))}
                {sortedItems.length > 0 && paddingTop > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ height: paddingTop, padding: 0, border: "none" }}
                    />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const item = sortedItems[virtualRow.index];
                  return (
                    <tr key={item.id}>
                      <td>{item.artist}</td>
                      <td>{item.title}</td>
                      <td>{item.year ?? "—"}</td>
                      <td>{item.genres[0] ?? "—"}</td>
                      <td>{item.labels[0] ?? "—"}</td>
                      <td>{formatDate(item.date_added)}</td>
                    </tr>
                  );
                })}
                {sortedItems.length > 0 && paddingBottom > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        height: paddingBottom,
                        padding: 0,
                        border: "none",
                      }}
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
