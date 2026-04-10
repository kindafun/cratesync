---
title: design-system
type: note
permalink: discogs-migration/design-system
---

# CrateSync Design System

This file owns implementation-facing UI rules. For product tone and durable design intent, see [.impeccable.md](../.impeccable.md).

## Current Direction

- Exposed grid structure, not soft card stacks
- Light, warm control surface with visible rules and square geometry
- IBM Plex Sans for dense UI copy and IBM Plex Serif for emphasis
- Orange for primary emphasis, green for success/source states, red for destructive states

## Core Tokens

### Color

- `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-surface-soft`
- `--color-rule`, `--color-rule-strong`
- `--color-ink`, `--color-muted`, `--color-faint`
- `--color-accent`, `--color-accent-strong`, `--color-accent-soft`
- `--color-success`, `--color-success-soft`
- `--color-danger`, `--color-danger-soft`, `--color-danger-ink`
- `--color-th-bg`, `--color-overlay`

### Typography

- `--font-ui`: interface copy
- `--font-display`: headings, account names, stat numerals
- `--text-label`, `--text-meta`, `--text-body`, `--text-body-dense`, `--text-table`
- `--text-title-sm`, `--text-title-md`, `--text-title-lg`, `--text-display`
- `--text-credit`, `--text-credit-sm`, `--text-stat`, `--text-stat-sm`, `--text-chip`

### Spacing and control sizing

- Base spacing tokens: `--space-2xs` through `--space-3xl`
- Semantic layout tokens: `--shell-padding`, `--section-gap`, `--section-divider-space`
- Stack tokens: `--stack-tight`, `--stack-sm`, `--stack-md`, `--stack-lg`, `--stack-xl`
- Inline-gap tokens: `--inline-gap-sm`, `--inline-gap-md`, `--inline-gap-lg`
- Control tokens: `--control-height`, `--control-padding-x`, `--control-padding-y`
- Table padding tokens: `--table-cell-padding-x`, `--table-cell-padding-y`

### Borders and radius

- `--radius-sm`, `--radius-md`, `--radius-pill` are intentionally `0px`
- `--radius-circle` is reserved for circular indicators only
- `--border-grid`, `--border-grid-strong`, `--border-section-divider` define structural rhythm

## Layout Rules

- Let rules and spacing define regions before introducing extra fills.
- Major transitions should use `--border-section-divider` and `--section-divider-space`.
- The topbar and shell columns should derive padding from shell tokens, not local ad hoc values.
- Collapsible sections are allowed when they reduce scanning cost without hiding capability.
- Virtualized table spacer rows should use shared styling, not inline border/padding overrides.

## Stylesheet Architecture

- `frontend/src/styles.css` is the stylesheet entrypoint only. Do not author selectors directly in that file.
- Put reusable CSS variables in `frontend/src/styles/tokens.css`.
- Put global reset and document-level behavior in `frontend/src/styles/base.css`.
- Put shell and section structure in `frontend/src/styles/layout.css`.
- Put shared UI primitives in `frontend/src/styles/primitives.css`.
- Put active feature-owned selectors under `frontend/src/styles/features/`.
- Leave reference-only selectors out of the active import graph unless that reference surface is intentionally being revived.

## Component Rules

- Account controls live with the Source and Destination sections they affect, not in a shared topbar dropdown or permanent left-rail panel.
- Per-section section headers should read in this order: title/collapse affordance, then account controls. Section summary metadata belongs in the toolbar row above the table, not in the shell header.
- Per-section account controls should stay compact: account identity plus sync freshness in the header, with `Sync` as the primary action and `Disconnect` demoted to a secondary affordance.
- Non-account shell headers should stay structured, but not empty: keep collapse plus title anchored on the left, and allow high-value actions or status on the right when they help the section scan as a single unit.
- Step 1 in the left rail owns plan configuration only; source filters live above the source table they affect.
- Bounded filter dimensions should use `PillSelect` with type-to-filter behavior instead of free-text inputs.
- Review state should read as a concise inline status line, not a padded feature banner.
- The job console should focus on toolbar, summary, and results; server-noise event feeds are not part of the main UI.
- Destructive actions must use danger styling and explicit confirmation.

## When Extending

- Add new tokens in `frontend/src/styles/tokens.css` only when they are reusable across at least two components.
- Prefer semantic token names over one-off numeric aliases.
- Keep display typography limited to emphasis moments; dense operational content should stay in the UI face.
- Add selectors to `primitives.css` only when at least two active features intentionally share the pattern.
- Add selectors to a feature stylesheet when the class is owned by one active surface, even if that surface spans more than one component.
- If a new reusable pattern needs documentation, update this file and the matching durable design intent in `.impeccable.md` when applicable.
