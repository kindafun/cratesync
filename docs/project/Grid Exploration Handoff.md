---
title: Grid Exploration Handoff
branch: ui/grid-functional-exploration
date: 2026-04-02
permalink: discogs-migration/project/grid-exploration-handoff
---

# Grid Exploration — Handoff

Branch: `ui/grid-functional-exploration`

## What This Is

A full design direction exploration. Four pillars were implemented together:

1. **Exposed grid** — The layout structure is visible. Table cells have four-sided borders. Section dividers use a heavier 2px rule. Panel boundaries (topbar, left/right column divide) are declared with stronger borders. No soft background cards — borders alone define regions.

2. **No rounded corners** — All `border-radius` tokens set to `0px`. Every button, input, chip, pill, card, and table wrapper is square. Two intentional exceptions: the scrollbar thumb (browser chrome) and the status dot (semantic circle indicator).

3. **Progressive disclosure** — Every major section in both panels is collapsible. Left rail: Accounts and Step 1 (planner). Right canvas: Source Selection, Destination Reference, Review and Launch, Job Console. Review section has a second-level inner collapse on the release review table.

4. **TE-inspired light palette** — Full light mode swap inspired by Teenage Engineering's off-white/orange aesthetic. Warm cream background, near-black text, TE orange accent replacing the previous dark amber theme.

---

## What Changed

### `frontend/tsconfig.json`

Added `"types": ["vite/client"]` to fix a pre-existing `ImportMeta.env` TypeScript error.

### `frontend/src/styles.css`

**New tokens (added to `:root`):**

- `--border-grid: 1px solid var(--color-rule)` — cell-to-cell table border
- `--border-grid-strong: 1px solid var(--color-rule-strong)` — wrapper/panel borders
- `--border-section-divider: 2px solid var(--color-rule-strong)` — section break rule
- `--color-th-bg: #ddd7cc` — sticky table header background

**Radius tokens zeroed:**

- `--radius-sm: 0px`, `--radius-md: 0px`, `--radius-pill: 0px`
- `.skeleton-cell` hardcoded `3px` → `0`

**Color palette (full light mode):**
| Token | Before | After |
|---|---|---|
| `--color-bg` | `#0c0b09` | `#f5f0e8` |
| `--color-surface` | `#11100d` | `#ede8df` |
| `--color-rule` | `#282420` | `#c8c0b4` |
| `--color-ink` | `#f0ead8` | `#1a1612` |
| `--color-muted` | `#9d9387` | `#6b6358` |
| `--color-accent` | `#d4a050` (amber) | `#f0522a` (TE orange) |
| `--color-success` | `#5ab87a` | `#1e7a3a` (darker for light bg) |
| `--color-danger` | `#c44832` | `#c42a1a` |
| `--surface-card` | `rgba(17,16,13,0.78)` | `rgba(237,232,223,0.85)` |

**Structural border upgrades:**

- `.topbar` bottom border → `--border-grid-strong`
- `.shell-left` right border → `--border-grid-strong`
- `.rail-section`, `.canvas-section` top borders → `--border-section-divider` (2px)
- `.planner-footer`, `.summary-strip` top borders → `--border-grid-strong`
- `.table-wrap` border → `--border-grid-strong`

**Table cell borders:**

- `.data-table th, td` changed from bottom-border-only to `border: var(--border-grid)`
- `.data-table th` gets `border-bottom: var(--border-grid-strong)` + `background: var(--color-th-bg)`

**Component background stripping:**

- `.filter-block`, `.saved-views-panel`, `.message`, `.conflict-card`, `.empty-block`, `.event` → `background: transparent`
- `.review-banner` color variants preserved (state urgency is load-bearing)
- `.toggle-option + .toggle-option` gets `border-left: var(--border-grid)` internal divider

**Progressive disclosure CSS:**

- `.section-collapse-icon` + `.section-collapse-icon.collapsed` — CSS chevron, reuses the same border-trick as `.snapshot-sort-chevron`
- `.rail-section-header` — clickable left rail section header
- `.canvas-header.is-toggle` — clickable canvas section header

**Other:**

- `body` background simplified to single subtle radial gradient with TE orange hint
- Scrollbar updated to orange-on-cream
- `input:focus` background `#17140f` → `#ddd7cc`
- `.btn-primary` text `#1a1200` → `#ffffff` (white on orange)
- All hardcoded `rgba()` values (state pills, role chips, banners, dot animations, row-selected) updated to new palette

### `frontend/src/components/SnapshotSection.tsx`

Added `useState(true)` collapsed state. Section **starts collapsed** — destination reference is rarely the first thing needed. Canvas header becomes a toggle div with `aria-expanded`, keyboard support, and `section-collapse-icon`.

### `frontend/src/components/SourceSelectionSection.tsx`

Added `useState(false)` collapsed state. Section **starts open** — primary action surface for step 2.

### `frontend/src/components/ReviewSection.tsx`

Added `useState(false)` outer section collapse + `useState(false)` inner table collapse. The toolbar actions (Generate preview / Launch job) use `stopPropagation` so clicking them doesn't toggle the section. The history-strip mode pills also use `stopPropagation`. The outer section now carries a `canvas-section-review` modifier so Review reads as the highest-stakes threshold step instead of another generic section.

### `frontend/src/components/JobConsoleSection.tsx`

Added `useState(false)` collapsed state. Section **starts open**.

### `frontend/src/App.tsx`

Added `accountsCollapsed` and `plannerCollapsed` state. Rail sections in `shell-left` are now collapsible via `rail-section-header`.

Latest continuation on this branch:

- `handleClearLocalData()` now asks for explicit confirmation before deleting local cache, account tokens, presets, and job history.
- The topbar destructive action uses `text-btn-danger` instead of the default neutral treatment.
- The oversized left-rail `h1` was replaced with a smaller semantic `h1.hero-title` ("Migration control") so branding no longer dominates the control surface.
- Planner footer counters now use the compact `StatBlock small` treatment and CSS overrides for inline bookkeeping proportions.
- Empty source-filter copy was tightened to: "No filters active — all source releases are in scope."
- Empty account-card heading copy was adjusted to "Authorize {role} account".
- Typography exploration pass: replaced `Bricolage Grotesque` + `Instrument Serif` with `IBM Plex Sans` + `IBM Plex Serif` across the app and design lab. Display serif now uses weight 500 with tighter negative tracking so headings and stat numerals read more like catalog plates against the square grid, while Plex Sans makes dense labels and tables feel more mechanical than the previous rounded grotesque.

Left rail spacing, hierarchy, and formatting pass (critique-driven):

- `.left-hero` gets `margin-bottom: var(--space-lg)` to reduce title-screen overhead on repeat use. `.lead-copy` is clipped to 2 visible lines via `-webkit-line-clamp` — full text stays in the DOM.
- `.credit-card:last-child` `padding-bottom` restored from `0` to `var(--space-md)` so the destination card has consistent bottom air before the STEP 1 section divider.
- `.saved-views-menu` gets `margin-top: var(--space-md)` to anchor it visually to the planner body rather than the section header.
- `Optional filters` label class changed from `field-label` to `section-label` (TE orange, uppercase, tracked) to distinguish the sub-section boundary from plain field labels above it. `.filter-builder` gets `margin-top: var(--space-sm)` for additional breathing room from the Workflow Mode toggle.
- Planner footer stat-label raised from `0.58rem` to `0.65rem` for legibility.
- `.empty-block.compact` text-align changed to `left` (split from `.empty-cell` which stays `center`) — the centred paragraph looked misaligned in a left-aligned single-column panel.

Hero removal and AccountCard redesign:

- `left-hero` block removed entirely — the "Migration control" h1 and lead-copy paragraph are gone. The left rail now opens directly on the ACCOUNTS section, eliminating title-screen overhead on every session.
- All associated CSS removed: `.left-hero`, `.hero-title`, `.lead-copy`, `.left-hero h1` rule and its responsive overrides.
- AccountCard (connected state) restructured: the single `.credit-meta` line that crammed sync timestamp and item count together is split into two sibling elements inside a new `.account-status` flex row. The sync timestamp stays muted; the item count gets its own `.credit-count` class (body size, ink color, weight 600) so it reads as data rather than log noise.
- Datetime format upgraded: `formatDateTime` (full locale string with seconds) replaced by new `formatSyncDateTime` helper that drops seconds precision — output is `M/D/YYYY, H:MM AM/PM`.
- `.credit-card` gains `display: flex; flex-direction: column; gap: var(--stack-sm)` so all child spacing is controlled by the container. The explicit `margin` on `.credit-name` is removed.
- Orphaned section dividers fixed: removing the left-hero left the first `.rail-section` and first `.canvas-section` with a floating 2px `border-top` and nothing above it. Added `:first-child` overrides to zero the border, padding-top, and margin-top on the first section in each container.

---

## Design Decisions Worth Preserving (or Reconsidering)

**What works well:**

- The 2px section dividers create a strong visual grid rhythm across both columns.
- Four-sided table cell borders make the data feel like a proper ledger. Sticky header with `--color-th-bg` reads as structurally distinct from the body.
- TE orange on cream is high-contrast and punchy without being harsh.
- `IBM Plex Serif` + `IBM Plex Sans` better matches the technical ledger direction than the previous softer grotesque/serif pairing: labels feel tighter and more machined, while headings still keep a Discogs-adjacent editorial register.
- Square buttons feel deliberate — the `.btn:active` scale transform now reads as a mechanical stamp press.
- Progressive disclosure is functionally correct: source selection open, destination hidden, review/console open.
- The accent-weighted Review divider creates a stronger "pre-launch checkpoint" moment than the generic 2px rule.
- Severity-tinted event rows keep the 3px left-stripe motif but restore enough tonal separation for mixed logs.

**Open questions for the next session:**

- The `review-banner` still carries a soft state fill while most other cards remain transparent. This still seems appropriate for urgency, but the exact fill strength may need one more contrast pass with real previews.
- `.btn` and chip radii are currently all square because `--radius-pill` is `0px`. The backlog note says button corners should become `--radius-sm` while chip-style tags stay round, which conflicts with this branch's stricter zero-radius exploration. Decide whether the no-radius pillar stays absolute or becomes more selective.
- Consider whether the amber-to-orange swap should be applied back to `main` independently of the grid exploration. The two changes are separable.

Canvas header alignment and collapse affordance pass (2026-04-03):

- `.canvas-header` `align-items` changed from `flex-end` to `center` — the label+h2 stack is taller than the meta text or chevron, so `flex-end` was pushing the right-side content down to the h2 baseline rather than centering it.
- Added `.canvas-header-right` flex wrapper grouping the `header-note` and `section-collapse-icon` in all four canvas components (`SourceSelectionSection`, `SnapshotSection`, `ReviewSection`, `JobConsoleSection`). This eliminates the three-way `space-between` layout where meta text ended up stranded in the center gap, and ensures the count + chevron always appear as a unified right-side block.
- Collapse chevron border-color upgraded from `--color-muted` to `--color-rule-strong` so it rests at a readable weight without hover.
- `.canvas-header.is-toggle:hover` now turns the chevron TE orange and dims the h2 to muted — replaces the blanket `opacity: 0.85` which was too subtle.

Cognitive load reduction — icons and account card differentiation (2026-04-03):

- Installed `lucide-react` (line-based, MIT, tree-shakeable). 10 icon placements:
  - **App.tsx buttons:** `RefreshCw` (Sync collection), `Unlink` (Disconnect), `Link` (Connect account), `Plus` (Add filter), `Trash2` (Clear local data)
  - **Workflow toggle:** `Copy` (Copy only), `ArrowRightLeft` (Two-phase move)
  - **Saved views summary:** `Bookmark`
  - **ReviewSection.tsx:** `ScanEye` (Generate preview), `Play` (Launch job)
- `.toggle-option` upgraded to `inline-flex; align-items: center; gap: 0.4rem` so icons and labels sit inline.
- `.text-btn` upgraded to `inline-flex; align-items: center; gap: 0.4rem` (was block, which broke icon/text alignment in the topbar danger button).
- Account card source/destination stripe: `.credit-card` now carries `border-left: 3px solid transparent` and `padding-left: var(--space-xs)` as baseline so layout is consistent across connected and empty states. Role-specific rules override the color only: `.credit-card:has(.role-source)` → `--color-success` (green), `.credit-card:has(.role-destination)` → `--color-accent` (orange). The transparent baseline + padding means the stripe area is always reserved, preventing layout shift between states.

---

## How to Run

```bash
git checkout ui/grid-functional-exploration
cd frontend && npm run dev      # port 5173
cd backend && uvicorn app.main:app --reload  # port 8421
```

New packages: `lucide-react` added to `frontend/`. Backend unchanged.

Validation run after latest continuation (icons + card stripe pass, 2026-04-03):

```bash
npm run build --prefix frontend
```

Step 1 hierarchy and filter relocation pass (2026-04-03):

- **Step 1 is now job configuration only** — Workflow mode toggle leads (primary decision), Plan name follows (metadata). Filter builder and saved views removed from the left rail entirely.
- **Filters relocated to Step 2** — The optional filter builder now renders inside `SourceSelectionSection` via a new `filterControls?: ReactNode` render slot, above the toolbar and table. This makes the cause→effect relationship direct: filters sit above the rows they narrow. Copy updated from "choose releases from the source table" to "Narrow your snapshot — add only the fields you need."
- **Saved views hidden until useful** — The `<details>` saved-views panel now only renders when `presets.length > 0`. New users see nothing; it appears only once presets exist. The previously-disabled select on an empty preset list is gone.
- **Native select chevron fixed** — `.filter-add-row select` now uses `appearance: none` with a custom inline SVG chevron (`background-image`) matching the muted color and weight of the sort chevrons in the table headers.
- **`.source-filter-zone`** — New CSS wrapper class providing bottom padding and a divider border separating the filter zone from the selection toolbar.

Filter UX overhaul (2026-04-03):

- **13 → 9 filter types** — Dropped `genre_search`, `label_search`, `format_search`, `style_search`. Each of those was a redundant free-text variant of the exact-match multi-select for the same dimension. The exact-match filters (`genres`, `labels`, `formats`, `styles`) now subsume both roles via a built-in type-to-filter input. `FILTER_OPTIONS` reordered: actionable filters (Artist, Title, Genres, Labels, Formats, Styles, Folders) lead; date filters follow.
- **`PillSelect` component** — Replaces `MultiValueSelect` (native `<select multiple>` with Ctrl+Click). Shows available snapshot values as clickable pill buttons. Click to toggle selection; selected pills highlighted in accent-soft. A search input appears automatically when there are more than 6 options to narrow the visible list. Folders use the same pattern (folder names as pills, mapped back to IDs internally). Located in `components/ui.tsx`.
- **Flat `FilterBlock`** — Removed the bordered card treatment and the `description` prop. Each active filter is now a `.filter-row`: a compact header line (`FIELD-LABEL ×`) and the control directly below it, separated from adjacent filters by a single light divider. No cards, no descriptions, no extra chrome.
- **Activation chips replace add-filter dropdown** — The `<select>` + "Add filter" button row replaced with a `.filter-chips` row: one small chip per remaining inactive filter type. Click a chip to add immediately. Chips disappear as filters are activated; the row disappears entirely when all filters are active.
- **State cleanup** — Removed `genreQuery`, `labelQuery`, `formatQuery`, `styleQuery`, and `nextFilterToAdd` state vars from `App.tsx`. Removed the `useEffect` that kept `nextFilterToAdd` in sync with available options. `buildFilters()` and `deriveLoadedFilterState()` updated accordingly.
