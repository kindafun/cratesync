import { Field, FilterBlock, PillSelect } from "./ui";
import type { FilterKey } from "../lib/filters";

interface FolderOption {
  id: number;
  label: string;
}

interface FilterKeyBlockProps {
  filterKey: FilterKey;
  onRemove(key: FilterKey): void;
  specificDate: string;
  setSpecificDate(v: string): void;
  dateFrom: string;
  setDateFrom(v: string): void;
  dateTo: string;
  setDateTo(v: string): void;
  artistQuery: string;
  setArtistQuery(v: string): void;
  titleQuery: string;
  setTitleQuery(v: string): void;
  genreOptions: string[];
  selectedGenres: string[];
  setSelectedGenres(v: string[]): void;
  labelOptions: string[];
  selectedLabels: string[];
  setSelectedLabels(v: string[]): void;
  formatOptions: string[];
  selectedFormats: string[];
  setSelectedFormats(v: string[]): void;
  styleOptions: string[];
  selectedStyles: string[];
  setSelectedStyles(v: string[]): void;
  folderOptions: FolderOption[];
  selectedFolderIds: number[];
  setSelectedFolderIds(v: number[]): void;
}

export function FilterKeyBlock({
  filterKey,
  onRemove,
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
  genreOptions,
  selectedGenres,
  setSelectedGenres,
  labelOptions,
  selectedLabels,
  setSelectedLabels,
  formatOptions,
  selectedFormats,
  setSelectedFormats,
  styleOptions,
  selectedStyles,
  setSelectedStyles,
  folderOptions,
  selectedFolderIds,
  setSelectedFolderIds,
}: FilterKeyBlockProps) {
  switch (filterKey) {
    case "specific_date":
      return (
        <FilterBlock label="Specific date" onRemove={() => onRemove(filterKey)}>
          <input
            type="date"
            aria-label="Specific date"
            value={specificDate}
            onChange={(event) => setSpecificDate(event.target.value)}
          />
        </FilterBlock>
      );
    case "date_range":
      return (
        <FilterBlock label="Date range" onRemove={() => onRemove(filterKey)}>
          <div className="field-grid">
            <Field label="Added after">
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </Field>
            <Field label="Added before">
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </Field>
          </div>
        </FilterBlock>
      );
    case "artist_search":
      return (
        <FilterBlock label="Artist" onRemove={() => onRemove(filterKey)}>
          <input
            type="text"
            aria-label="Artist name"
            placeholder="e.g. Four Tet"
            value={artistQuery}
            onChange={(event) => setArtistQuery(event.target.value)}
          />
        </FilterBlock>
      );
    case "title_search":
      return (
        <FilterBlock label="Title" onRemove={() => onRemove(filterKey)}>
          <input
            type="text"
            aria-label="Release title"
            placeholder="e.g. Rounds"
            value={titleQuery}
            onChange={(event) => setTitleQuery(event.target.value)}
          />
        </FilterBlock>
      );
    case "genres":
      return (
        <FilterBlock label="Genres" onRemove={() => onRemove(filterKey)}>
          <PillSelect
            options={genreOptions}
            values={selectedGenres}
            onChange={setSelectedGenres}
            ariaLabel="Filter by genre"
          />
        </FilterBlock>
      );
    case "labels":
      return (
        <FilterBlock label="Labels" onRemove={() => onRemove(filterKey)}>
          <PillSelect
            options={labelOptions}
            values={selectedLabels}
            onChange={setSelectedLabels}
            ariaLabel="Filter by label"
          />
        </FilterBlock>
      );
    case "formats":
      return (
        <FilterBlock label="Formats" onRemove={() => onRemove(filterKey)}>
          <PillSelect
            options={formatOptions}
            values={selectedFormats}
            onChange={setSelectedFormats}
            ariaLabel="Filter by format"
          />
        </FilterBlock>
      );
    case "styles":
      return (
        <FilterBlock label="Styles" onRemove={() => onRemove(filterKey)}>
          <PillSelect
            options={styleOptions}
            values={selectedStyles}
            onChange={setSelectedStyles}
            ariaLabel="Filter by style"
          />
        </FilterBlock>
      );
    case "folders":
      return (
        <FilterBlock label="Folders" onRemove={() => onRemove(filterKey)}>
          <PillSelect
            options={folderOptions.map((o) => o.label)}
            values={folderOptions
              .filter((o) => selectedFolderIds.includes(o.id))
              .map((o) => o.label)}
            onChange={(labels) =>
              setSelectedFolderIds(
                folderOptions
                  .filter((o) => labels.includes(o.label))
                  .map((o) => o.id),
              )
            }
            ariaLabel="Filter by folder"
          />
        </FilterBlock>
      );
  }
}
