import { memo, useMemo, useState } from "react";

import { formatDate, formatDateTime } from "../lib/format";
import { sortSnapshotItems, type SnapshotSortColumn, type SnapshotSortDirection } from "../lib/sort";
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
                  <th key={column.key} aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
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
              loading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><span className="skeleton-cell skeleton-cell-long" /></td>
                    <td><span className="skeleton-cell skeleton-cell-long" /></td>
                    <td><span className="skeleton-cell skeleton-cell-short" /></td>
                    <td><span className="skeleton-cell skeleton-cell-mid" /></td>
                    <td><span className="skeleton-cell skeleton-cell-mid" /></td>
                    <td><span className="skeleton-cell skeleton-cell-short" /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    Sync this account to populate the local snapshot.
                  </td>
                </tr>
              )
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
