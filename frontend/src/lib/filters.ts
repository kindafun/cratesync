import type { CollectionItemSnapshot, SelectionFilters } from "./types";
import { toDateTimeLocalValue, toIsoDateTime, startOfDayIso, endOfDayIso } from "./format";

export type FilterKey =
  | "specific_date"
  | "date_range"
  | "artist_search"
  | "title_search"
  | "label_search"
  | "genre_search"
  | "format_search"
  | "style_search"
  | "genres"
  | "labels"
  | "formats"
  | "styles"
  | "folders";

export const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "specific_date", label: "Specific date" },
  { key: "date_range", label: "Date range" },
  { key: "artist_search", label: "Artist search" },
  { key: "title_search", label: "Title search" },
  { key: "label_search", label: "Label search" },
  { key: "genre_search", label: "Genre search" },
  { key: "format_search", label: "Format search" },
  { key: "style_search", label: "Style search" },
  { key: "genres", label: "Genres" },
  { key: "labels", label: "Labels" },
  { key: "formats", label: "Formats" },
  { key: "styles", label: "Styles" },
  { key: "folders", label: "Folders" },
];

export const EMPTY_FILTERS: SelectionFilters = {
  date_from: null,
  date_to: null,
  artist_query: null,
  title_query: null,
  label_query: null,
  genre_query: null,
  format_query: null,
  style_query: null,
  folder_ids: [],
  genres: [],
  labels: [],
  formats: [],
  styles: [],
  year_min: null,
  year_max: null,
  rating_min: null,
  manual_include_snapshot_item_ids: [],
  manual_exclude_snapshot_item_ids: [],
  text_query: null,
};

export function buildFilters(input: {
  activeFilterKeys: FilterKey[];
  specificDate: string;
  dateFrom: string;
  dateTo: string;
  artistQuery: string;
  titleQuery: string;
  labelQuery: string;
  genreQuery: string;
  formatQuery: string;
  styleQuery: string;
  selectedFolderIds: number[];
  selectedGenres: string[];
  selectedLabels: string[];
  selectedFormats: string[];
  selectedStyles: string[];
}): SelectionFilters {
  const hasSpecificDate = input.activeFilterKeys.includes("specific_date");
  const hasDateRange = input.activeFilterKeys.includes("date_range");

  return {
    date_from: hasSpecificDate
      ? input.specificDate
        ? startOfDayIso(input.specificDate)
        : null
      : hasDateRange && input.dateFrom
        ? toIsoDateTime(input.dateFrom)
        : null,
    date_to: hasSpecificDate
      ? input.specificDate
        ? endOfDayIso(input.specificDate)
        : null
      : hasDateRange && input.dateTo
        ? toIsoDateTime(input.dateTo)
        : null,
    artist_query: input.activeFilterKeys.includes("artist_search")
      ? input.artistQuery.trim() || null
      : null,
    title_query: input.activeFilterKeys.includes("title_search")
      ? input.titleQuery.trim() || null
      : null,
    label_query: input.activeFilterKeys.includes("label_search")
      ? input.labelQuery.trim() || null
      : null,
    genre_query: input.activeFilterKeys.includes("genre_search")
      ? input.genreQuery.trim() || null
      : null,
    format_query: input.activeFilterKeys.includes("format_search")
      ? input.formatQuery.trim() || null
      : null,
    style_query: input.activeFilterKeys.includes("style_search")
      ? input.styleQuery.trim() || null
      : null,
    folder_ids: input.activeFilterKeys.includes("folders") ? input.selectedFolderIds : [],
    genres: input.activeFilterKeys.includes("genres") ? input.selectedGenres : [],
    labels: input.activeFilterKeys.includes("labels") ? input.selectedLabels : [],
    formats: input.activeFilterKeys.includes("formats") ? input.selectedFormats : [],
    styles: input.activeFilterKeys.includes("styles") ? input.selectedStyles : [],
    year_min: null,
    year_max: null,
    rating_min: null,
    manual_include_snapshot_item_ids: [],
    manual_exclude_snapshot_item_ids: [],
    text_query: null,
  };
}

export function filterSourceItems(
  items: CollectionItemSnapshot[],
  filters: SelectionFilters,
): CollectionItemSnapshot[] {
  const normalizedGenres = new Set(filters.genres.map((value) => value.toLowerCase()));
  const normalizedLabels = new Set(filters.labels.map((value) => value.toLowerCase()));
  const normalizedFormats = new Set(filters.formats.map((value) => value.toLowerCase()));
  const normalizedStyles = new Set(filters.styles.map((value) => value.toLowerCase()));
  const artistQuery = filters.artist_query?.trim().toLowerCase();
  const titleQuery = filters.title_query?.trim().toLowerCase();
  const labelQuery = filters.label_query?.trim().toLowerCase();
  const genreQuery = filters.genre_query?.trim().toLowerCase();
  const formatQuery = filters.format_query?.trim().toLowerCase();
  const styleQuery = filters.style_query?.trim().toLowerCase();
  const legacyQuery = filters.text_query?.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.date_from) {
      if (
        !item.date_added ||
        new Date(item.date_added).getTime() < new Date(filters.date_from).getTime()
      ) {
        return false;
      }
    }
    if (filters.date_to) {
      if (
        !item.date_added ||
        new Date(item.date_added).getTime() > new Date(filters.date_to).getTime()
      ) {
        return false;
      }
    }
    if (filters.folder_ids.length > 0 && !filters.folder_ids.includes(item.folder_id)) {
      return false;
    }
    if (
      normalizedGenres.size > 0 &&
      !item.genres.some((value) => normalizedGenres.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (
      normalizedLabels.size > 0 &&
      !item.labels.some((value) => normalizedLabels.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (
      normalizedFormats.size > 0 &&
      !item.formats.some((value) => normalizedFormats.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (
      normalizedStyles.size > 0 &&
      !item.styles.some((value) => normalizedStyles.has(value.toLowerCase()))
    ) {
      return false;
    }
    if (artistQuery && !item.artist.toLowerCase().includes(artistQuery)) {
      return false;
    }
    if (titleQuery && !item.title.toLowerCase().includes(titleQuery)) {
      return false;
    }
    if (labelQuery && !item.labels.some((value) => value.toLowerCase().includes(labelQuery))) {
      return false;
    }
    if (genreQuery && !item.genres.some((value) => value.toLowerCase().includes(genreQuery))) {
      return false;
    }
    if (formatQuery && !item.formats.some((value) => value.toLowerCase().includes(formatQuery))) {
      return false;
    }
    if (styleQuery && !item.styles.some((value) => value.toLowerCase().includes(styleQuery))) {
      return false;
    }
    if (legacyQuery) {
      const haystack = [
        item.artist,
        item.title,
        item.folder_name ?? String(item.folder_id),
        item.labels.join(" "),
        item.genres.join(" "),
        item.formats.join(" "),
        item.styles.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(legacyQuery)) {
        return false;
      }
    }
    return true;
  });
}

export function deriveFolderOptions(
  items: CollectionItemSnapshot[],
): Array<{ id: number; label: string }> {
  const seen = new Map<number, string>();
  for (const item of items) {
    if (!seen.has(item.folder_id)) {
      seen.set(item.folder_id, item.folder_name ?? `Folder ${item.folder_id}`);
    }
  }
  return Array.from(seen.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function deriveFolderLookup(items: CollectionItemSnapshot[]): Record<number, string> {
  const lookup: Record<number, string> = {};
  for (const item of items) {
    lookup[item.folder_id] = item.folder_name ?? `Folder ${item.folder_id}`;
  }
  return lookup;
}

export function deriveStringOptions(
  items: CollectionItemSnapshot[],
  key: "genres" | "labels" | "formats" | "styles",
): string[] {
  const values = new Set<string>();
  for (const item of items) {
    for (const entry of item[key]) {
      if (entry) values.add(entry);
    }
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right));
}

export function deriveLoadedFilterState(filters: SelectionFilters) {
  const activeFilterKeys: FilterKey[] = [];
  let specificDate = "";
  let dateFrom = "";
  let dateTo = "";

  const derivedSpecificDate = tryDeriveSpecificDate(filters.date_from, filters.date_to);
  if (derivedSpecificDate) {
    activeFilterKeys.push("specific_date");
    specificDate = derivedSpecificDate;
  } else if (filters.date_from || filters.date_to) {
    activeFilterKeys.push("date_range");
    dateFrom = toDateTimeLocalValue(filters.date_from);
    dateTo = toDateTimeLocalValue(filters.date_to);
  }

  if ((filters.genres ?? []).length > 0) activeFilterKeys.push("genres");
  if ((filters.labels ?? []).length > 0) activeFilterKeys.push("labels");
  if ((filters.formats ?? []).length > 0) activeFilterKeys.push("formats");
  if ((filters.styles ?? []).length > 0) activeFilterKeys.push("styles");
  if ((filters.folder_ids ?? []).length > 0) activeFilterKeys.push("folders");
  if (filters.artist_query) activeFilterKeys.push("artist_search");
  if (filters.title_query) activeFilterKeys.push("title_search");
  if (filters.label_query) activeFilterKeys.push("label_search");
  if (filters.genre_query) activeFilterKeys.push("genre_search");
  if (filters.format_query) activeFilterKeys.push("format_search");
  if (filters.style_query) activeFilterKeys.push("style_search");

  return {
    activeFilterKeys,
    specificDate,
    dateFrom,
    dateTo,
    artistQuery: filters.artist_query ?? "",
    titleQuery: filters.title_query ?? "",
    labelQuery: filters.label_query ?? "",
    genreQuery: filters.genre_query ?? "",
    formatQuery: filters.format_query ?? "",
    styleQuery: filters.style_query ?? "",
  };
}

function tryDeriveSpecificDate(dateFrom?: string | null, dateTo?: string | null): string {
  if (!dateFrom || !dateTo) return "";
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
  const sameDay =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth() &&
    from.getUTCDate() === to.getUTCDate();
  return sameDay ? from.toISOString().slice(0, 10) : "";
}

export function appendUnique(current: string[], nextValues: string[]): string[] {
  const seen = new Set(current);
  const merged = [...current];
  for (const value of nextValues) {
    if (seen.has(value)) continue;
    seen.add(value);
    merged.push(value);
  }
  return merged;
}

export function sanitizeStringMap(values: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (trimmed) {
      next[key] = trimmed;
    }
  }
  return next;
}
