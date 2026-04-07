import { useMemo, useState } from "react";
import {
  FILTER_OPTIONS,
  buildFilters,
  deriveFolderLookup,
  deriveFolderOptions,
  deriveStringOptions,
  type FilterKey,
} from "../lib/filters";
import type { CollectionItemSnapshot } from "../lib/types";

export function useSelectionFilters(
  sourceItems: CollectionItemSnapshot[],
  destinationItems: CollectionItemSnapshot[],
) {
  const [activeFilterKeys, setActiveFilterKeys] = useState<FilterKey[]>([]);
  const [specificDate, setSpecificDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [artistQuery, setArtistQuery] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const filters = useMemo(
    () =>
      buildFilters({
        activeFilterKeys,
        specificDate,
        dateFrom,
        dateTo,
        artistQuery,
        titleQuery,
        selectedFolderIds,
        selectedGenres,
        selectedLabels,
        selectedFormats,
        selectedStyles,
      }),
    [
      activeFilterKeys,
      specificDate,
      dateFrom,
      dateTo,
      artistQuery,
      titleQuery,
      selectedFolderIds,
      selectedGenres,
      selectedLabels,
      selectedFormats,
      selectedStyles,
    ],
  );

  const folderOptions = useMemo(
    () => deriveFolderOptions(sourceItems),
    [sourceItems],
  );
  const genreOptions = useMemo(
    () => deriveStringOptions(sourceItems, "genres"),
    [sourceItems],
  );
  const labelOptions = useMemo(
    () => deriveStringOptions(sourceItems, "labels"),
    [sourceItems],
  );
  const formatOptions = useMemo(
    () => deriveStringOptions(sourceItems, "formats"),
    [sourceItems],
  );
  const styleOptions = useMemo(
    () => deriveStringOptions(sourceItems, "styles"),
    [sourceItems],
  );
  const destinationFolderLookup = useMemo(
    () => deriveFolderLookup(destinationItems),
    [destinationItems],
  );

  const availableFilterOptions = useMemo(
    () =>
      FILTER_OPTIONS.filter((option) => {
        if (activeFilterKeys.includes(option.key)) return false;
        if (
          option.key === "specific_date" &&
          activeFilterKeys.includes("date_range")
        )
          return false;
        if (
          option.key === "date_range" &&
          activeFilterKeys.includes("specific_date")
        )
          return false;
        return true;
      }),
    [activeFilterKeys],
  );

  function addFilter(key: FilterKey) {
    setActiveFilterKeys((current) => {
      const withoutConflicts = current.filter((value) => {
        if (key === "specific_date" && value === "date_range") return false;
        if (key === "date_range" && value === "specific_date") return false;
        return true;
      });
      return withoutConflicts.includes(key)
        ? withoutConflicts
        : [...withoutConflicts, key];
    });
    if (key === "specific_date") {
      setDateFrom("");
      setDateTo("");
    }
    if (key === "date_range") {
      setSpecificDate("");
    }
  }

  function removeFilter(key: FilterKey) {
    setActiveFilterKeys((current) => current.filter((value) => value !== key));
    if (key === "specific_date") setSpecificDate("");
    if (key === "date_range") {
      setDateFrom("");
      setDateTo("");
    }
    if (key === "artist_search") setArtistQuery("");
    if (key === "title_search") setTitleQuery("");
    if (key === "genres") setSelectedGenres([]);
    if (key === "labels") setSelectedLabels([]);
    if (key === "formats") setSelectedFormats([]);
    if (key === "styles") setSelectedStyles([]);
    if (key === "folders") setSelectedFolderIds([]);
  }

  return {
    activeFilterKeys,
    setActiveFilterKeys,
    specificDate,
    setSpecificDate,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    artistQuery,
    setArtistQuery,
    titleQuery,
    setTitleQuery,
    selectedFolderIds,
    setSelectedFolderIds,
    selectedGenres,
    setSelectedGenres,
    selectedLabels,
    setSelectedLabels,
    selectedFormats,
    setSelectedFormats,
    selectedStyles,
    setSelectedStyles,
    filters,
    folderOptions,
    genreOptions,
    labelOptions,
    formatOptions,
    styleOptions,
    destinationFolderLookup,
    availableFilterOptions,
    addFilter,
    removeFilter,
  };
}
