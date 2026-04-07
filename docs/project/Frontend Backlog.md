---
title: Frontend Backlog
type: note
permalink: discogs-migration/project/frontend-backlog
tags:
  - backlog
  - frontend
  - impeccable
---

# Frontend Backlog

As of session 6 (2026-04-02). Sessions 5–6 completed `/quieter`, table virtualization, component extraction, sync progress, and a full `/critique`. Remaining:

## Medium — from session 6 critique

- `/normalize` — Switch all `.btn` variants from `border-radius: var(--radius-pill)` to `var(--radius-sm)` (4px). Pill buttons contradict the "heavy, intentional, precise" brand personality. Chip-style elements (`.state-pill`, `.role-chip`, `.chip-button`, `.history-pill`) should stay round — they're semantically tag-like.
- `/arrange` — Add visual weight differentiation between the four right-column sections (Source, Destination, Review, Job Console). Review is the highest-stakes section and should feel like a threshold, not another `border-top`. Consider a thicker or accent-tinted top rule, or larger top margin.
- `/harden` — "Clear local data" is a destructive action styled as the friendliest element in the topbar (pill `.text-btn`). Needs a confirmation step and danger-level visual treatment, or relocation out of the topbar.

## Low / Backlog

- `/distill` — The `h1` "CrateSync" in the left rail uses `clamp(3rem, 6vw, 5.8rem)` — display scale in a control surface. Branding already lives in the topbar badge. Reduce to `var(--text-title-lg)` or remove entirely; let the lead copy introduce the tool.
- `/typeset` — Stat blocks in the planner footer (`.stat-value` at 2.15rem) are oversized for bookkeeping counters. Reduce to compact inline text: `24 selected · 892 visible · 1,147 total` in `text-meta`, or use the small variant.
- `/polish` — Firefox scrollbar CSS (currently WebKit-only via `-webkit-scrollbar`; standard `scrollbar-color` already covers Firefox at basic level)
- `/extract` (continued) — App.tsx is now ~1,250 lines; remaining split candidates are `FolderConflictCard`, `CustomFieldConflictCard`, and `deriveReviewState`, but all are tightly coupled to App state. `AccountCard` was redesigned in-place (flat `.acct-row` layout) and is no longer a split priority.

## Completed (sessions 1–7)

- **Session 7**: Accounts moved from sidebar rail to topbar `<details>` dropdown; `AccountCard` redesigned as flat `.acct-row` grid (role chip + content column, no card chrome); topbar trigger shows dynamic status label (`"Action needed"` / `"2 connected"` / `"Syncing…"`); `Disconnect` de-risked to `.text-btn`; design system compliance pass (display font on `.acct-row-name`, spacing tokens)
- **Session 6**: Real-time sync progress (async backend, polling frontend, live `Fetching N / M releases…` in AccountCard); status message moved to topbar; design critique conducted
- **Session 5 continued**: `/quieter` — removed success-green body radial gradient; extracted `ReviewSection.tsx`, `JobConsoleSection.tsx`; virtualized source + destination tables with `@tanstack/react-virtual`
- **Session 5**: `/extract` — Extracted `SourceSelectionSection`, `SnapshotSection`, and primitive UI components (`Field`, `StatBlock`, `FilterBlock`, `MultiValueSelect`) from App.tsx
- **Sessions 1–4**: `/normalize`, `/optimize`, `/adapt`, `/harden`, `/delight`, `/polish`

---

## Design Critique — Session 6 (2026-04-02)

Full critique conducted via `/impeccable:critique`. Summary below.

### Anti-Patterns Verdict: Pass

Does not look AI-generated. Warm amber-on-near-black palette, Bricolage Grotesque + Instrument Serif, editorial density — all deliberately reject the AI default stack. No cyan, no purple gradients, no glassmorphism. **One tell**: pill buttons on all `.btn` variants.

### What's Working

1. **Color system is genuinely distinctive** — warm #0c0b09 tinted toward amber, green at 13% opacity for selected rows, amber on table headers. Coherent and on-brand.
2. **Font pairing is editorial and memorable** — Bricolage Grotesque UI + Instrument Serif display. Account usernames in serif at 1.65rem is smart — the collector's name rendered bookishly has personality.
3. **Job console event feed** — `grid-template-columns: 3px 1fr` left-stripe pattern for events is elegant, scalable, memorable. The most "designed" piece in the interface.

### Priority Issues

1. **Pill buttons vs brand personality** — `border-radius: var(--radius-pill)` on all `.btn` creates softness inconsistent with "heavy, intentional, precise." Fix: `var(--radius-sm)` on all button variants. → `/normalize`
2. **Display-scale h1 in the left rail** — `clamp(3rem, 6vw, 5.8rem)` for "CrateSync" occupies ~87px at 1440px in a control surface. Decorative chrome; branding already in topbar. Fix: reduce to title-lg or remove. → `/distill`
3. **Right-column sections lack hierarchy** — all four sections share identical `border-top` treatment. No signal about which are primary (source, review) vs secondary. Fix: Give ReviewSection a heavier visual entry. → `/arrange`
4. **"Clear local data" is a destructive action with casual styling** — `.text-btn` pill in the topbar. No confirmation. Fix: danger styling + confirmation, or relocate. → `/harden`
5. **Stat blocks oversized for their role** — 2.15rem Instrument Serif for operational counters ("Selected releases: 24") approaches hero-metric-layout anti-pattern. Fix: compact inline text or small variant. → `/typeset`

### Minor Observations

- "Authorize source" at 1.65rem display in the empty AccountCard reads as placeholder, not instructional — use a smaller muted style
- Filter builder empty state copy is dry; "No filters active — all releases in scope" is tighter and more confident
- `section-label` in accent orange on both "Step 1" (good) and "Accounts" (inflated) — consider muting organizational labels, reserving accent for step labels
- The scrollbar gradient (amber-to-brown) is a lovely detail that earns its keep
