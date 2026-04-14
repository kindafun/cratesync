import { useState, type ReactNode } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function StatBlock({
  label,
  value,
  muted = false,
  small = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`stat-block${small ? " stat-block-small" : ""}`}>
      <span className={`stat-value${muted ? " muted" : ""}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export function FilterBlock({
  label,
  children,
  onRemove,
}: {
  label: string;
  children: ReactNode;
  onRemove(): void;
}) {
  return (
    <div className="filter-row">
      <div className="filter-row-header">
        <span className="field-label">{label}</span>
        <button
          type="button"
          className="filter-remove-btn"
          onClick={onRemove}
          aria-label={`Remove ${label} filter`}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

export function PillSelect({
  options,
  values,
  onChange,
  ariaLabel,
}: {
  options: string[];
  values: string[];
  onChange(values: string[]): void;
  ariaLabel?: string;
}) {
  const [search, setSearch] = useState("");

  if (options.length === 0) {
    return (
      <div className="empty-block compact">
        No values available in the synced source snapshot.
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const selected = new Set(values);

  const selectedOptions = options.filter((o) => selected.has(o));
  const unselectedOptions = options.filter(
    (o) => !selected.has(o) && (!query || o.toLowerCase().includes(query)),
  );
  const visible = [...selectedOptions, ...unselectedOptions];

  function toggle(option: string) {
    if (selected.has(option)) {
      onChange(values.filter((v) => v !== option));
    } else {
      onChange([...values, option]);
    }
  }

  return (
    <div className="pill-select" role="group" aria-label={ariaLabel}>
      {options.length > 6 && (
        <input
          className="pill-select-search"
          type="text"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filter options"
        />
      )}
      <div className="pill-options">
        {visible.map((option) => (
          <button
            key={option}
            type="button"
            className={`pill-option${selected.has(option) ? " selected" : ""}`}
            onClick={() => toggle(option)}
            aria-pressed={selected.has(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
