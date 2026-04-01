import type { CollectionItemSnapshot } from "./types";

export type SnapshotSortColumn =
  | "artist"
  | "title"
  | "year"
  | "folder"
  | "genre"
  | "style"
  | "label"
  | "format"
  | "added";

export type SnapshotSortDirection = "asc" | "desc";

export function sortSnapshotItems(
  items: CollectionItemSnapshot[],
  sortColumn: SnapshotSortColumn | null,
  sortDirection: SnapshotSortDirection,
): CollectionItemSnapshot[] {
  if (!sortColumn) return items;

  return [...items].sort((left, right) =>
    compareSnapshotSortValues(
      snapshotSortValue(left, sortColumn),
      snapshotSortValue(right, sortColumn),
      sortDirection,
    ),
  );
}

function snapshotSortValue(
  item: CollectionItemSnapshot,
  column: SnapshotSortColumn,
): string | number | null {
  switch (column) {
    case "artist":
      return item.artist;
    case "title":
      return item.title;
    case "year":
      return item.year ?? null;
    case "folder":
      return item.folder_name ?? String(item.folder_id);
    case "genre":
      return item.genres[0] ?? null;
    case "style":
      return item.styles[0] ?? null;
    case "label":
      return item.labels[0] ?? null;
    case "format":
      return item.formats[0] ?? null;
    case "added":
      return item.date_added ? new Date(item.date_added).getTime() : null;
  }
}

function compareSnapshotSortValues(
  left: string | number | null,
  right: string | number | null,
  direction: SnapshotSortDirection,
): number {
  const multiplier = direction === "asc" ? 1 : -1;
  const leftEmpty = left === null || left === "";
  const rightEmpty = right === null || right === "";

  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return direction === "asc" ? 1 : -1;
  if (rightEmpty) return direction === "asc" ? -1 : 1;

  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * multiplier;
  }

  return String(left).localeCompare(String(right), undefined, { sensitivity: "base" }) * multiplier;
}
