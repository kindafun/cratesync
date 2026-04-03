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

3. **Progressive disclosure** — Every major section in both panels is collapsible. Left rail: Accounts and Step 1 (planner). Right canvas: Source Selection, Destination Reference, Review and Launch, Job Console. Review section has a second-level inner collapse on the release review table. The saved views `<details>` element stays accessible even when the planner body is collapsed.

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
Added `accountsCollapsed` and `plannerCollapsed` state. Rail sections in `shell-left` are now collapsible via `rail-section-header`. The saved views `<details>` sits **outside** the planner collapse body so it remains accessible when the filter builder is hidden.

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

---

## How to Run

```bash
git checkout ui/grid-functional-exploration
cd frontend && npm run dev      # port 5173
cd backend && uvicorn app.main:app --reload  # port 8421
```

No new packages. Backend unchanged.

Validation run after the latest continuation (left rail spacing/hierarchy pass, 2026-04-03):

```bash
npm run build --prefix frontend
```
