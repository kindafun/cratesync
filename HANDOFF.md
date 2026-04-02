# CrateSync — Session Handoff

**Repo:** `kindafun/cratesync` · **Branch:** `main` · **Last updated:** 2026-04-02 (session 6)

---

## What this project is

**CrateSync** is a local macOS tool for Discogs collectors with 1,000+ release libraries. It runs as a Vite/React frontend talking to a local backend, enabling high-stakes collection migrations (split, merge, reorganize) across Discogs accounts.

**Stack:**
- Frontend: React 19, TypeScript 5.8, Vite 7 — no UI library, pure CSS with custom design tokens
- Backend: local process (API calls via `src/lib/api.ts`)
- No build step needed for dev — `vite dev` against the local backend

**Key entry points:**
- `frontend/src/App.tsx` — main application (~1,285 lines after this session)
- `frontend/src/styles.css` — all styles, comprehensive CSS custom properties design system
- `frontend/src/lib/` — utility modules
- `frontend/src/components/` — standalone components

---

## What was done this session (2026-04-02, session 6)

### `/quieter` — Remove success-green ambient gradient from body background

**Files changed:** `frontend/src/styles.css`

**Change:** Removed `radial-gradient(circle at 100% 100%, rgba(90, 184, 122, 0.08), transparent 24%)` from the `body` background stack.

The green glow occupied the bottom-right corner of the viewport at all times, including when there is no active sync, no selected source, nothing happening. `--color-success` is the semantic color for source accounts, selected rows, and successful job states — ambient background color is not that context. The warm gold glow at top-left (`rgba(212, 160, 80, 0.14)`) is kept as it maps to the accent/primary-action color and reads as the app's resting character rather than a status signal.

### `/extract` (continued) — ReviewSection and JobConsoleSection extracted from App.tsx

**Files changed:** `frontend/src/App.tsx` (−327 lines), new component files

**New files:**
- `frontend/src/components/ReviewSection.tsx` (303 lines) — Step 3 "Review and launch" section; carries `FolderConflictCard`, `CustomFieldConflictCard`, and the review table. `reviewTableMode` kept in App.tsx (reset on new preview in `handlePreview`). `ReviewState` type exported for use upstream.
- `frontend/src/components/JobConsoleSection.tsx` (139 lines) — "Job console" section; job history pills, event feed, item outcome table, rollback/confirm-delete controls.

**App.tsx import cleanup:**
- Removed `formatDate`, `renderCapabilities`, `statusTone` from format import (all moved to component files)
- Removed `PreviewConflict` from types import (no longer explicitly annotated in App.tsx)
- Removed `FolderConflictCard`, `CustomFieldConflictCard` functions (moved to `ReviewSection.tsx`)

**App.tsx line count:** ~1,612 → ~1,285 lines

---

## What was done previously (2026-04-02, session 5)

### `/extract` — Component extraction from App.tsx monolith

**Files changed:** `frontend/src/App.tsx` (−446 lines), new component files

**New files:**
- `frontend/src/components/ui.tsx` (89 lines) — `Field`, `StatBlock`, `FilterBlock`, `MultiValueSelect`
- `frontend/src/components/SourceSelectionSection.tsx` (233 lines) — sortable selection table with skeleton loading and shift-click range selection; carries `SOURCE_COLUMNS` and its own sort state
- `frontend/src/components/SnapshotSection.tsx` (138 lines) — sortable destination reference table; carries `SNAPSHOT_COLUMNS` and its own sort state

**Left in App.tsx at the time (deliberate):**
- `AccountCard` — small, tightly coupled to connect/sync/disconnect handlers
- `FolderConflictCard`, `CustomFieldConflictCard` — subsequently moved to `ReviewSection.tsx` in session 6
- `deriveReviewState` — pure function tightly coupled to App's preview state; still in App.tsx

**App.tsx import cleanup:**
- Removed `memo`, `type KeyboardEvent`, `type ReactNode` from React import (all moved to component files)
- Removed `sortSnapshotItems`, `SnapshotSortColumn`, `SnapshotSortDirection` from sort import (moved to component files)

---

## What was done previously (2026-04-02, session 4)

Commit `34f0996` — `/polish` run.

### `/polish` — Hover states, date input styling, button feedback, page title

**Files changed:** `frontend/src/App.tsx`, `frontend/src/styles.css`

**CSS fixes:**
- `input[type="date"]` added to design-system input selector — the Specific Date filter block was rendering with browser-default styling instead of design tokens
- `.saved-views-menu summary` — added `transition` property and `:hover` state (consistent with `.text-btn`); previously had instant/no feedback on hover
- `.chip-button:hover:not(.active)` / `.history-pill:hover:not(.active)` — added hover state (border + ink color); job history pills had zero hover feedback
- `.account-slot-hint` — removed dead CSS class (defined but never referenced in App.tsx)

**App.tsx fixes:**
- "Generate preview" button now `disabled={isGeneratingPreview}` and shows `"Checking…"` text during generation — was previously spammable with no button-level feedback
- `blocking issue(s)` → proper plural (`blocking issue` / `blocking issues`) — inconsistent with all other pluralization in the codebase
- Dynamic `document.title` via new `useEffect` — updates to `Syncing… · CrateSync` during sync and `{jobStatus} · {jobName} · CrateSync` during active jobs; resets to `CrateSync` at rest

---

## What was done previously (2026-04-02, session 3)

### `/delight` — Loading skeletons, sync state, micro-interactions, keyboard shortcuts

**Files changed:** `frontend/src/App.tsx`, `frontend/src/styles.css`

**Loading states:**
- `SourceSelectionSection` — when `!snapshot && loading`, renders 8 animated skeleton rows (shimmer gradient) instead of plain empty-cell text. Triggered by both workspace refresh and Discogs sync.
- `SnapshotSection` — same pattern for the destination table, 6 skeleton rows.
- Preview section — `isGeneratingPreview` state added; while preview API call is in flight, the empty-block shows "Checking selections against destination…" with three shimmer bars.
- `AccountCard` — new `syncing?: boolean` prop; sync button goes `disabled` + `"Syncing…"` text for the full duration of `api.syncCollection()` (before `refreshWorkspace` is even called). Disconnect also disabled during sync.

**New state/refs added:**
- `isSyncing: string | null` — accountId being synced; set in `handleSync` entry, cleared in `finally`
- `isGeneratingPreview: boolean` — set in `handlePreview` entry, cleared in `finally`
- `savedViewsRef: RefObject<HTMLDetailsElement>` — ref on the Saved Views `<details>` element for keyboard control
- `handlePreviewRef` — mutable ref kept current each render, used by keyboard handler to avoid stale closure

**Keyboard shortcuts:**
- `Escape` — closes Saved Views panel if open
- `⌘G` / `Ctrl+G` — triggers Generate Preview from anywhere (no-ops if focus is in a text/date input)

**CSS micro-interactions:**
- `--duration-snap: 60ms` — new motion token for instant-feel interactions
- `.status-dot` — `animation: dot-pulse 2.4s ease-in-out infinite` (slow organic pulse)
- `.status-dot-busy` — `animation: dot-pulse-busy 1.1s ease-in-out infinite` (faster active beat)
- `.btn` — `transform` added to transition list
- `.btn:active:not(:disabled)` — `scale(0.97)` with `transition-duration: var(--duration-snap)`
- `.filter-block` — `animation: slide-in 200ms ease-out both` on mount (plays only for new filters due to stable `key` props)
- `.review-banner-ready` — `animation: banner-in 240ms ease-out both` (fades up 5px when review goes green)

**New keyframes/classes added to `styles.css`:**
- `@keyframes dot-pulse`, `dot-pulse-busy`, `slide-in`, `banner-in`, `sk-shimmer`
- `.skeleton-cell` (shimmer base), `.skeleton-cell-short/mid/long` (width variants)
- `.skeleton-row td` (vertical padding for skeleton rows)
- `.preview-loading`, `.preview-loading-label`, `.preview-loading-bars`

---

## What was done previously (2026-04-01, session 2)

Commit `e5b36fd` — `/harden` run.

### `/harden` — Accessibility, error resilience, validation

**Files changed:** `frontend/src/App.tsx`, `frontend/src/styles.css`

**Heading hierarchy (WCAG 1.3.1):**
- `<div className="section-label">Accounts</div>` → `<h2>` — the Accounts rail section had no heading element
- `<div className="editorial-title">Build the source view</div>` → `<h2>` — Step 1 heading was a styled div
- `<div className="section-label">Included release review</div>` → `<h3>` — subsection within Step 3's `<h2>`

**`aria-label` coverage:**
- All 7 text/date filter inputs inside `FilterBlock` now have `aria-label` (previously placeholder-only or unlabeled)
- `MultiValueSelect` gains optional `ariaLabel` prop; all 4 usages pass `"Filter by genre/label/format/style"`
- Folder `<select multiple>` → `aria-label="Filter by folder"`
- Filter-picker `<select>` → `aria-label="Select filter to add"`
- `FolderConflictCard` select → `aria-label="Map {folderName} to destination folder"`
- `CustomFieldConflictCard` input → `aria-label="Destination field name for {fieldName}"`
- Sort column `<th>` elements → `aria-sort="ascending|descending|none"` in both `SourceSelectionSection` and `SnapshotSection`

**Retry buttons:**
- New `retryFn` state (`useState<(() => void) | null>`)
- `refreshWorkspace`, `handleSync`, `handlePreview` — set `setRetryFn(null)` at entry; set retry callback in catch
- Status-line now renders a `"Try again"` button (`.btn.btn-ghost.btn-sm`) when `retryFn` is set
- `.status-line` updated to `display: flex` to keep button inline with message text
- `.btn-sm` modifier class added to `styles.css`

**Client-side validation:**
- `handlePreview` — new early-return guard when `selectedSourceCount === 0`: `"Select at least one release before generating a preview."`

---

## What was done previously (2026-04-01, session 1)

Commit `daeeff5` — three `/impeccable` skills run in sequence.

### 1. `/normalize` — Design system consistency

**Files changed:** `frontend/src/styles.css`, `frontend/src/App.tsx`, `frontend/src/components/SnapshotExplorer.tsx`

- **Duration tokens added:** `--duration-fast: 120ms` and `--duration-base: 140ms` in `:root` under new `/* Motion */` section. All 5 hardcoded transition durations (`140ms` ×4, `120ms` ×1) replaced with tokens.
- **Max-height fixed:** `max-height: 38rem` → `min(38rem, 70vh)` on `.table-wrap-tall`; `max-height: 53rem` → `min(53rem, 80vh)` on `.snapshot-frame-wrap`
- **`history-empty` retired:** Sole-use class removed from shared CSS rule. `App.tsx:1201` now uses `className="text-muted text-meta"`. New `.text-meta` utility class added (font-size + line-height).
- **`SnapshotExplorer.tsx` inline style fixed:** `style={{ color: "var(--faint)", ... }}` — `--faint` doesn't exist (correct token is `--color-faint`) — replaced with `className="empty-cell"`.

### 2. `/optimize` — React performance for 1,000+ item libraries

**Files changed:** `frontend/src/App.tsx`

**Import updated:** Added `memo, useCallback, useMemo` to React import.

**`useMemo` applied to all expensive render-path computations:**

| Value | Why it matters |
|---|---|
| `filters` | `buildFilters()` called on every keystroke |
| `filteredSourceItems` | Full scan of 1,000+ items with Set comparisons — the #1 bottleneck |
| `filteredSourceItemIds` | `.map()` over filtered results |
| `selectedSourceIdSet` | `new Set(1,000+ ids)` recreated each render |
| `previewSelectedIds` / `duplicateReleaseIds` | `new Set()` from preview data |
| `currentPlan` | Object construction + `sanitizeStringMap` |
| `currentPlanSignature` | `JSON.stringify()` on full plan object |
| `folderOptions` | Full item scan |
| `genreOptions` / `labelOptions` / `formatOptions` / `styleOptions` | 4× full item scans |
| `destinationFolderLookup` | Full destination item scan |
| `availableFilterOptions` | `FILTER_OPTIONS.filter()` |

**`useCallback` for stable handler references** (prerequisite for `memo()` to work):
- `toggleSourceSelection` — no deps (uses setter pattern)
- `selectSourceRange` — no deps
- `selectFilteredItems` — deps: `filteredSourceItemIds`
- `deselectFilteredItems` — deps: `filteredSourceItemIds`
- `clearSelectedItems` — no deps

**`memo()` + `useMemo(sortedItems)` on both heavy table components:**
- `SourceSelectionSection` — wrapped in `memo()`; `sortedItems` memoized; `SOURCE_COLUMNS` promoted to module-scope constant
- `SnapshotSection` — wrapped in `memo()`; `sortedItems` memoized; `SNAPSHOT_COLUMNS` promoted to module-scope constant

Both components now skip re-render entirely during job polling, status bar updates, and other App state changes unrelated to their props.

### 3. `/adapt` — Responsive layout and touch targets

**Files changed:** `frontend/src/styles.css`

**Intermediate breakpoint at 960px:**
- The 1180px breakpoint previously collapsed the entire 2-col grid. Now it only adjusts `--shell-padding-right`.
- New `@media (max-width: 960px)` block handles the grid collapse. This restores 220px of usable 2-col viewport range (960–1180px).

**Touch targets on mobile (≤760px):**
- `--control-height: 2.75rem` (44px) added to the 760px `:root` override — all `.btn` and `input` elements now meet WCAG 2.5.5 minimum automatically
- `.toggle-option` — `min-height: var(--control-height)` at mobile
- `.chip-button` — `min-height: var(--control-height)` + `padding-block: var(--space-xs)` at mobile
- `.saved-views-menu summary` — `min-height: var(--control-height)` + `display: flex; align-items: center; justify-content: center;` at mobile

---

## Current file structure (frontend/src/)

```
src/
├── App.tsx                        # ~1,285 lines — main app, all state + render
├── main.tsx                       # Entry point, wraps with ErrorBoundary
├── styles.css                     # ~1,340 lines — full design system
├── components/
│   ├── AccountConnections.tsx     # ⚠ Not imported by App.tsx (design lab variant)
│   ├── ErrorBoundary.tsx          # ✅ Wraps app root
│   ├── JobConsole.tsx             # ⚠ Not imported by App.tsx (design lab variant)
│   ├── JobConsoleSection.tsx      # ✅ Execution / job console section (extracted session 7)
│   ├── PlannerPanel.tsx           # ⚠ Not imported by App.tsx (design lab variant)
│   ├── ReviewSection.tsx          # ✅ Step 3 review + launch section (extracted session 7)
│   ├── SnapshotExplorer.tsx       # ⚠ Not imported by App.tsx (design lab variant)
│   ├── SnapshotSection.tsx        # ✅ Destination reference table (extracted session 5)
│   ├── SourceSelectionSection.tsx # ✅ Source selection table (extracted session 5)
│   └── ui.tsx                     # ✅ Field, StatBlock, FilterBlock, MultiValueSelect (extracted session 5)
└── lib/
    ├── api.ts                     # All API calls, backend URL config
    ├── filters.ts                 # Filter logic, buildFilters, filterSourceItems, derive* helpers
    ├── format.ts                  # Display/format utils
    ├── oauth.ts                   # OAuth popup helpers
    ├── sort.ts                    # Snapshot table sorting
    └── types.ts                   # All shared TypeScript types
```

> **Note on design lab variants:** `AccountConnections.tsx`, `JobConsole.tsx`, `PlannerPanel.tsx`, `SnapshotExplorer.tsx` are **not imported by App.tsx**. They use different CSS class names from the production app. Do not delete without confirming.

---

## Known pre-existing issues (not introduced this session)

- `src/lib/api.ts:14` — TypeScript error: `Property 'env' does not exist on type 'ImportMeta'`. Pre-existing tsconfig/vite-env mismatch. Does not affect runtime.
- tsconfig targets ES2020 but `App.tsx` uses `.replaceAll()` (ES2021). Vite/esbuild transpiles fine; only `tsc --noEmit` reports it.

---

## Remaining audit items (prioritized)

### High
*(All previously-high items are now complete: `/normalize`, `/optimize`, `/adapt`)*

### Medium
*(All medium items are now complete)*

### Low / backlog
- **`/polish`** — Firefox scrollbar CSS: `scrollbar-color`/`scrollbar-width` already handles Firefox (gold thumb, dark track). No further action required.
- **`/adapt`** (continued) — Virtualize large tables with `@tanstack/react-virtual`; all rows currently render in DOM, limited by CSS `max-height` scroll. Approach discussed, not yet implemented.
- **`/extract`** (continued) — App.tsx now ~1,285 lines. Remaining candidates: `AccountCard` (small, tightly coupled to handlers); `renderFilterBlock` + Step 1 sidebar (depends on 15+ filter state values, feasible with props).

---

## Design system reference

**Fonts:** Bricolage Grotesque (UI) + Instrument Serif (display/headings) — Google Fonts

**Color tokens (all in `:root`):**
```css
--color-bg: #0c0b09           /* near-black background */
--color-surface: #11100d
--color-ink: #f0ead8          /* primary text */
--color-muted: #9d9387        /* secondary text */
--color-faint: #6a6258        /* tertiary text */
--color-accent: #d4a050       /* gold — primary actions */
--color-accent-strong: #ddb065
--color-accent-soft: rgba(212, 160, 80, 0.14)
--color-success: #5ab87a      /* green — source/success */
--color-danger: #c44832       /* red/rust — destructive */
--color-rule: #282420         /* borders */
```

**Motion tokens (new this session):**
```css
--duration-fast: 120ms        /* chevron/sort animations */
--duration-base: 140ms        /* buttons, inputs, toggles */
```

**Semantic mapping:** gold = primary/action, green = success/source, red = danger/destructive, muted = secondary info

**Button classes:** `.btn.btn-primary` (gold fill), `.btn.btn-ghost` (border only), `.btn.btn-danger` (red tint), `.btn.btn-sm` (smaller — overrides min-height and padding, font-size: text-meta)

**Utility classes:**
- `.text-muted`, `.text-faint` — color utilities
- `.text-meta` — font-size: var(--text-meta) + line-height (new this session)
- `.empty-block` / `.empty-block.compact` — bordered card empty state
- `.empty-cell` — table row empty state (`<td>`)

**Common patterns:**
- Section labels: `<div className="section-label">` — small caps, accent color
- Fields: `<Field label="...">` component wraps `<label>` + child input
- Filter blocks: `<FilterBlock label description onRemove>` — bordered card with remove button
- Stat display: `<StatBlock label value muted? small?>` — serif number + uppercase label
- Empty states: `<div className="empty-block">` or `<td className="empty-cell">` in tables

---

## Brand / aesthetic rules (from CLAUDE.md)

- **Bold. Technical. Focused.** — no consumer/mobile aesthetics
- Dark with warm undertones. Orange + sage green accents only.
- Anti-references: no neon/cyan/purple, no glassmorphism, no SaaS dashboards
- Consequential actions feel serious, not alarming
- Density with clarity — pack information tightly, never obscure it
