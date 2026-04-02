# CrateSync — Source of Truth

App name: **CrateSync**. Repo: `kindafun/cratesync`, branch `main`. Working directory is "Discogs Migration" — same thing.

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 7 — no UI library, pure CSS |
| Backend | FastAPI + Uvicorn on `127.0.0.1:8421` |
| Data | SQLite at `app_data/`, OAuth tokens in macOS Keychain |
| Fonts | Bricolage Grotesque (UI) + Instrument Serif (display/headings) |

No cloud component. All data stays on the user's machine. macOS only.

---

## Build Commands

```bash
# Frontend (port 5173)
cd frontend && npm run dev

# Backend (port 8421)
cd backend && uvicorn app.main:app --reload
```

---

## Architectural Decisions

**App.tsx is an intentional partial monolith.** ~1,250 lines as of session 6. State, handlers, and render JSX stay there. `AccountCard`, `FolderConflictCard`, `CustomFieldConflictCard`, and `deriveReviewState` are still in App.tsx — further extraction requires state restructuring. Don't refactor without a plan.

**Six active components, four design lab variants.** Active: `SnapshotSection`, `SourceSelectionSection`, `ReviewSection`, `JobConsoleSection`, `ErrorBoundary`, `ui.tsx`. Design lab (not imported by App.tsx): `AccountConnections`, `JobConsole`, `PlannerPanel`, `SnapshotExplorer`. Do not delete lab variants without confirming.

**Sync is async with polling.** `POST /collections/{id}/sync` returns immediately and starts a background task. Frontend polls `GET /collections/{id}/sync-progress` every 800ms until `status: done` or `status: error`. Progress lives in an in-memory dict in `routes.py` — intentional for a single-user local tool.

**OAuth 1.0a via popup.** Frontend opens an auth URL in a popup; backend completes the exchange; callback page uses `window.postMessage` to signal the opener. Access tokens stored in Keychain only — never in SQLite directly.

**No test mocks for the database.** Integration tests hit a real database. Mocked tests have caused prod migration failures before.

---

## Design Decisions

**Color:** On this branch, TE-inspired light mode is the active exploration: warm cream background, near-black ink, TE orange accent, darker Discogs-green for success/source states, and red for destructive/error. No cyan, no purple gradients, no glassmorphism.

**Grid and radius:** Layout structure is intentionally exposed. Table cells use four-sided borders, section boundaries use stronger rules, and card fills are minimized so borders define regions. This branch also zeroes `--radius-sm`, `--radius-md`, and `--radius-pill`; the all-square geometry is part of the exploration, not an accident.

**Destructive actions need weight.** "Clear local data" and similar operations require a confirmation step and danger-level visual treatment. Do not present them as neutral utility actions.

**Progressive disclosure is structural.** Left rail sections, right-canvas sections, and the review table can collapse independently. Destination starts collapsed; source selection and review start open.

**Display serif is for emphasis only.** Account names, section titles, and threshold states. Routine planner counters should stay compact and inline; do not let metric numerals become a hero treatment.

**Right-column sections are not equal.** Review is the highest-stakes section and needs a heavier visual entry (thicker rule, accent tint, or larger margin) than Source, Destination, and Job Console.

**Event feed pattern:** Keep the `3px + 1fr` event-row structure in Job Console. Severity-tinted row backgrounds are allowed, but the left stripe remains the primary status marker.

---

## Coding Conventions

- Confirm before `npm install` or large feature changes — walk through the plan first
- No speculative abstractions: implement what the task requires, nothing more
- No backwards-compat shims for removed code — delete it cleanly
- No comments unless the logic is non-obvious
- Validate only at system boundaries (user input, external APIs); trust internal guarantees
- New CSS tokens go in `frontend/src/styles.css` only when reusable across ≥2 components

---

## 95% Confidence Rule

If you're not 95% sure a file, function, flag, or token exists right now — verify before recommending. Memory and training data go stale. Grep or Read before you assert.

---

## Context Rules

- **Use subagents for exploration and research.** Any task that requires browsing the codebase without a known target, understanding how a subsystem works, or multi-file analysis (3+ files) — spawn a subagent. Return only summarized insights, not raw file dumps.
- **Use tools directly for targeted lookups.** Known file path → `Read`. Known symbol → `Grep`. Known pattern → `Glob`. Don't spawn a subagent for a one-shot lookup.
- **Parallelize independent tool calls.** If two reads or searches don't depend on each other, run them in the same message.
- **Don't re-read files you've already read in the same session** unless verifying a stale assumption.

---

## Applied Learning

When something fails repeatedly, when the user has to re-explain, or when a workaround is found for a platform/tool limitation, add a one-line bullet here. Keep each bullet under 15 words. No explanations. Only add things that will save time in future sessions.

---

## Current Backlog (session 6, 2026-04-02)

| Priority | Skill | Task |
|---|---|---|
| Medium | `/normalize` | Decide whether this branch keeps zero-radius everywhere or restores rounded chip/tag pills while keeping `.btn` square |
| Medium | `/arrange` | Review threshold styling is in place; do one more hierarchy pass with real migration data |
| Medium | `/harden` | Confirmation exists for "Clear local data"; consider whether the action should move out of the topbar entirely |
| Low | `/distill` | Left-rail title is smaller now; validate whether "Migration control" should stay or disappear |
| Low | `/typeset` | Planner stats are compact now; review section counters may still be oversized |
| Low | `/polish` | Firefox scrollbar CSS (`scrollbar-color`) |
| Low | `/extract` | App.tsx split candidates blocked on state restructuring |

---

## Where More Lives

| Topic | File |
|---|---|
| Architecture & data flow | `docs/architecture.md` |
| Design system & tokens | `docs/design-system.md` |
| Dev setup & environment | `docs/dev-setup.md` |
| Migration workflow | `docs/migration-workflow.md` |
| macOS packaging | `docs/package-macos.md` |
| Full backlog & critique | `docs/project/Frontend Backlog.md` |
| Project identity | `docs/project/CrateSync Project Identity.md` |
