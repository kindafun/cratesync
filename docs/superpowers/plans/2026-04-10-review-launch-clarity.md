# Review and Launch Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `software-development/subagent-driven-development` to execute this plan task-by-task. Use `software-development/requesting-code-review` before the final commit.

**Goal:** Refine the active review experience so the app answers one core question instantly: can this migration be launched safely right now, and if not, what exactly must be resolved first?

**Architecture:** Keep the current frontend data flow intact: `App.tsx` continues deriving launch readiness from preview state and passes review props into `ReviewSection`. Improve the experience by introducing a richer, explicit review summary model, then reorganizing `ReviewSection` around three scanning layers: readiness summary, blocking actions, and included-item evidence. Avoid backend contract changes for this pass; use existing `PreviewResponse`, `ReviewState`, and selection data unless a small frontend-only derived type materially improves clarity.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, existing CSS token system, `@tanstack/react-virtual`

---

## Why this next

This branch already completed the shell/header cleanup and the frontend build is passing. The durable design docs now point at review as the main threshold step:

- `.impeccable.md`: "Review is the threshold step"
- `docs/design-system.md`: "Review state should read as a concise inline status line"

The current `frontend/src/components/ReviewSection.tsx` still combines readiness, conflict handling, metadata capability notes, and the evidence table in one dense vertical flow. This plan tightens that surface without changing the underlying migration workflow.

---

## Success criteria

After this work:

1. The top of Review and launch communicates readiness in one compact scan.
2. Blocking conflicts read as required actions, not just content that happens to appear.
3. The preview evidence table better explains why rows are included, chosen-but-excluded, or duplicate-blocked.
4. Empty, stale, and ready states feel intentionally designed rather than incidental.
5. Shared docs stay aligned with the refined interaction model.

---

## File map

| File | Change |
| --- | --- |
| `frontend/src/App.tsx` | Replace the current lightweight review-state derivation with a richer review summary payload and pass it into `ReviewSection` |
| `frontend/src/lib/types.ts` | Expand or replace the current `ReviewState` type so the component can render explicit readiness, blockers, and evidence counts |
| `frontend/src/components/ReviewSection.tsx` | Recompose the review surface around readiness summary, blocking queue, capabilities, and evidence table |
| `frontend/src/styles/features/review.css` | Add the new review summary, blocker queue, and evidence-table styling |
| `frontend/src/styles/primitives.css` | Only if a new reusable primitive is truly shared across more than one active section |
| `docs/design-system.md` | Document any durable implementation-facing rule changes introduced by the new review pattern |
| `.impeccable.md` | Update only if the refined review interaction changes durable product/design guidance |

---

## Task 1: Define a richer review summary model in app state

**Objective:** Stop treating review readiness as only a title/message pair and derive enough structured information to drive a clearer UI.

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/App.tsx:210-246`
- Modify: `frontend/src/App.tsx:490-550`

- [ ] **Step 1: Replace the current `ReviewState` shape with a structured summary model**

In `frontend/src/lib/types.ts`, replace the minimal review state:

```ts
export type ReviewTone = "default" | "warning" | "ready";

export interface ReviewState {
  tone: ReviewTone;
  title: string;
  message: string;
}
```

with a structure that can support a compact readiness line plus supporting facts. Keep the naming simple, for example:

```ts
export type ReviewTone = "default" | "warning" | "ready";

export interface ReviewChecklistItem {
  label: string;
  status: "done" | "attention" | "blocked";
}

export interface ReviewState {
  tone: ReviewTone;
  title: string;
  message: string;
  launchLabel: string;
  blockerCount: number;
  checklist: ReviewChecklistItem[];
}
```

Do not add speculative fields that are not rendered in this pass.

- [ ] **Step 2: Update `deriveReviewState()` to return structured readiness information**

In `frontend/src/App.tsx`, keep the current branching logic order but enrich each branch with:
- a short `launchLabel` like `Not ready`, `Preview required`, `Resolve blockers`, `Ready`
- a numeric `blockerCount`
- a `checklist` describing the gating facts the user cares about most

Use only facts already available in `App.tsx`:
- source/destination connected and synced
- selection count
- preview presence
- preview stale status
- blocking conflict count

Suggested checklist categories:
- Accounts connected
- Source selection made
- Preview current
- Blocking conflicts cleared

- [ ] **Step 3: Keep `launchBlocked` as the launch authority**

Do not move launch-authority logic into `ReviewSection`. The existing boolean in `App.tsx` remains canonical for disabling launch.

- [ ] **Step 4: Pass the richer review state through existing props**

Keep prop plumbing minimal: continue passing `reviewState` into `ReviewSection`, but ensure the new type is used everywhere cleanly.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/App.tsx
git commit -m "Refine review state into a structured readiness summary"
```

---

## Task 2: Recompose the Review and launch section around scanning order

**Objective:** Make the section read top-to-bottom as decision summary, required actions, then evidence.

**Files:**
- Modify: `frontend/src/components/ReviewSection.tsx`

- [ ] **Step 1: Replace the current `review-status` block with a compact readiness summary row**

At the top of the section body, replace the current:
- status line
- immediate summary strip ordering

with a tighter structure like:
- primary readiness line: title + launch label
- supporting message line
- compact checklist or chips for the gating facts
- stat strip beneath it

The intent is to make the first scan answer:
- What state is this in?
- Why?
- What remains?

Do not turn this into a padded hero banner; keep it compact and structural.

- [ ] **Step 2: Keep action buttons in the header, but make their relationship clearer**

Retain:
- `Generate preview`
- `Launch job`

But make sure the body directly underneath explains launch readiness in the same vocabulary the buttons imply. The user should not need to infer why launch is disabled.

- [ ] **Step 3: Promote blocking conflicts into an explicit required-actions group**

When `preview.blocking_conflicts.length > 0`, render a labeled block above capability notes and above the evidence table. The block should read like a queue of actions required before launch, not like generic cards dropped into the flow.

Guidance:
- keep folder and custom field conflicts visually grouped together
- preserve existing override controls
- prepend a concise heading like `Resolve before launch`
- reflect the blocker count from `reviewState`

- [ ] **Step 4: Keep metadata capability notes secondary**

The current `Job behavior` / capability-chip area is useful, but it is not the main decision gate. Keep it below readiness and blockers. If needed, relabel it more directly around transfer behavior or metadata handling.

- [ ] **Step 5: Preserve the no-preview empty state, but align it with the new readiness language**

When no preview exists:
- keep the loading skeleton path
- keep the explanatory empty block
- update the copy so it matches the new summary language and doesn’t duplicate the same explanation twice

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ReviewSection.tsx
git commit -m "Recompose review section around readiness and blockers"
```

---

## Task 3: Improve the included-item evidence table

**Objective:** Make the table better explain preview outcomes instead of only listing rows.

**Files:**
- Modify: `frontend/src/components/ReviewSection.tsx`

- [ ] **Step 1: Rename and frame the table as evidence, not just a generic review list**

The current header `Included release review` is serviceable but vague. Rename the table block to something more explicit, for example:
- `Preview evidence`
- `Included release evidence`
- `Selection evidence`

Pick one and use it consistently with the new summary model.

- [ ] **Step 2: Improve the state column language**

The current pills are:
- `Included`
- `Chosen`
- `Not chosen`
- optional `Duplicate`

Refine this to make the distinction clearer between:
- explicitly selected and included in preview
- explicitly selected but excluded from preview because of duplication or another reason surfaced by current data
- rows visible only because the user switched to `All source rows`

Stay within currently available data; do not invent backend-only exclusion reasons.

- [ ] **Step 3: Make the table mode toggle feel tied to the evidence question**

The `Selected only` / `All source rows` toggle is useful but currently tucked into the header. Keep the toggle, but ensure the table title and nearby copy explain why someone would switch modes.

- [ ] **Step 4: Preserve virtualization and current performance behavior**

Do not remove `useVirtualizer`, spacer rows, or scroll container structure.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ReviewSection.tsx
git commit -m "Clarify preview evidence table states and framing"
```

---

## Task 4: Style the refined review surface to match current direction

**Objective:** Support the new review structure with compact, high-signal styling that matches the exposed-grid visual language.

**Files:**
- Modify: `frontend/src/styles/features/review.css`
- Modify: `frontend/src/styles/primitives.css` only if a selector is genuinely reusable

- [ ] **Step 1: Replace the existing `review-status` treatment with a lighter structural summary pattern**

Current CSS in `frontend/src/styles/features/review.css` uses a left-border message block. Replace or reduce that treatment so the new summary feels compact, not banner-like.

Add selectors for the new structure, for example:
- `.review-summary`
- `.review-summary-head`
- `.review-launch-state`
- `.review-checklist`
- `.review-checklist-item`

Only add selectors actually used by the component.

- [ ] **Step 2: Add a clear visual treatment for required-action conflicts**

Keep conflict cards square and structural. Use rule weight, spacing, and label hierarchy rather than decorative fills.

Suggested selectors:
- `.review-blockers`
- `.review-blockers-head`
- existing `.conflict-grid` / `.conflict-card` updated as needed

- [ ] **Step 3: Add styling for the evidence framing and table-mode context**

Support the refined table title/toggle relationship without introducing a whole new design language.

- [ ] **Step 4: Check mobile behavior at the existing breakpoints**

Ensure the new summary/checklist/actions stack cleanly at `max-width: 760px` and do not fight the already-updated shell/header patterns.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/features/review.css frontend/src/styles/primitives.css
git commit -m "Style review readiness, blocker queue, and evidence framing"
```

---

## Task 5: Sync docs and verify the frontend

**Objective:** Keep the durable UI guidance aligned and verify the refined review surface compiles cleanly.

**Files:**
- Modify: `docs/design-system.md`
- Modify: `.impeccable.md` only if durable guidance changes

- [ ] **Step 1: Update implementation-facing review guidance**

In `docs/design-system.md`, refine the existing review rule so it matches the implemented pattern. The current line says:

- `Review state should read as a concise inline status line, not a padded feature banner.`

If the new implementation adds checklist/blocker structure, extend this rule rather than replacing it with vague language. Keep it implementation-facing.

- [ ] **Step 2: Update `.impeccable.md` only if the durable design principle changed**

If the implementation reinforces the existing threshold-step principle without changing it, no update is necessary. If you introduce a stronger durable rule such as explicit blocker-first sequencing, add that guidance here.

- [ ] **Step 3: Run build verification**

```bash
npm run build --prefix frontend
```

Expected: successful Vite production build with no TypeScript errors.

- [ ] **Step 4: Sanity-check the review surface in the browser**

Verify at least these states manually:
- no accounts/snapshots
- accounts connected but no selection
- selected rows with no preview yet
- stale preview
- preview with conflicts
- preview ready to launch

- [ ] **Step 5: Commit**

```bash
git add docs/design-system.md .impeccable.md

git commit -m "Document refined review readiness guidance"
```

---

## Out of scope for this plan

Do not include these in the same implementation unless the work proves inseparable:

- backend API changes
- changing migration semantics
- redesigning the destination snapshot section
- redesigning the source filter builder
- major job-console audit improvements

Those are good follow-up candidates, but this plan should stay focused on the review threshold step.

---

## Follow-up candidate after this plan

If this review pass lands cleanly, the next likely plan should target `frontend/src/components/JobConsoleSection.tsx` so completed and in-flight jobs read as a collector-friendly audit record rather than a developer-facing result table.
