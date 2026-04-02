import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
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
  description,
  children,
  onRemove,
}: {
  label: string;
  description: string;
  children: ReactNode;
  onRemove(): void;
}) {
  return (
    <article className="filter-block">
      <div className="filter-block-header">
        <div>
          <div className="field-label">{label}</div>
          <p className="filter-block-copy">{description}</p>
        </div>
        <button className="text-btn filter-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
      {children}
    </article>
  );
}

export function MultiValueSelect({
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
  if (options.length === 0) {
    return <div className="empty-block compact">No values available in the synced source snapshot.</div>;
  }

  return (
    <select
      multiple
      aria-label={ariaLabel}
      value={values}
      onChange={(event) =>
        onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
      }
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
