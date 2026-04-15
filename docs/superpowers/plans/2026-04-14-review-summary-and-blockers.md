# Review Summary and Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Review and launch summary and blockers area easier to scan by replacing ambiguous interpretation copy with concrete state, and by turning confusing blocker cards into explicit action prompts.

**Architecture:** Keep the existing review data flow intact. Derive clearer summary and blockers presentation from the current selection count, preview payload, and conflict payload in the frontend. Limit structural changes to `ReviewSection` and related presentation helpers unless the audit proves the current data contract cannot support clear blocker wording.

**Tech Stack:** React 19, TypeScript 5.8, Vite 7, existing CSS token system

---

## Success criteria

1. The summary strip shows concrete state and never implies unsupported semantics.
2. Stale preview copy explains the mismatch directly.
3. Blockers read like required actions, not generic cards.
4. A raw field key like `field_1` is understandable in context.
5. The section stays dense and aligned with the product's operator-oriented design language.

## File map

| File | Change |
| --- | --- |
| `frontend/src/components/ReviewSection.tsx` | Refine summary-strip structure, blockers section framing, and conflict-card copy |
| `frontend/src/styles/features/review.css` | Update layout and hierarchy for the summary strip and conflict cards |
| `frontend/src/lib/reviewPresentation.ts` | Add any derived summary or blocker copy helpers if needed |
| `frontend/src/lib/types.ts` | Only if a small derived frontend type improves clarity without changing backend contracts |
| `docs/design-system.md` | Update only if this pass introduces a durable review-surface rule |
| `.impeccable.md` | Update only if the change affects durable design guidance |

## Task 1: Audit the current review summary and blockers language

**Files:**
- Inspect: `frontend/src/components/ReviewSection.tsx`
- Inspect: `frontend/src/lib/reviewPresentation.ts`
- Inspect: `frontend/src/styles/features/review.css`

- [ ] **Step 1: List every user-facing string in the summary strip and blockers section**

Capture the current labels, headings, body copy, placeholders, and button text for:

- summary metrics
- stale/ready/no-preview messaging
- blockers section heading and copy
- folder conflict cards
- custom-field conflict cards

- [ ] **Step 2: Mark each string with one of three statuses**

Use:

- `keep`
- `rewrite`
- `remove`

Focus on ambiguity, internal jargon, duplicated meaning, and unsupported implications.

- [ ] **Step 3: Confirm whether custom-field conflicts expose any human-readable label beyond `field_name`**

If the payload only includes the raw key, design around that limitation by adding task context in the title and copy instead of waiting on backend work.

- [ ] **Step 4: Write down the final wording targets before touching code**

Lock the replacement strings for:

- summary metric labels
- stale-preview explainer
- blockers section heading and subcopy
- folder conflict card title/body
- custom-field conflict card title/body

## Task 2: Reframe the summary strip around concrete state

**Files:**
- Modify: `frontend/src/components/ReviewSection.tsx`
- Modify: `frontend/src/lib/reviewPresentation.ts` only if derived copy is cleaner there

- [ ] **Step 1: Replace the current summary-strip labels with concrete terms**

Use labels in this shape:

- `Current selection`
- `Last preview`
- `Duplicates on destination`

Do not use percentage-based interpretation language in the default state.

- [ ] **Step 2: Add stale-preview explanatory copy only when needed**

When the preview is stale, render concise explanatory copy near the summary strip:

```text
Preview is out of date. Last preview included X releases; Y are now selected. Refresh preview.
```

When the preview is current, render no extra explainer.

- [ ] **Step 3: Keep zero-duplicate cases visually quiet and non-zero cases more prominent**

Do not introduce a new card layout. Keep the strip structural, but make the duplicate metric easier to notice when the value is non-zero.

- [ ] **Step 4: Preserve current launch-readiness logic**

Do not change how the app decides whether launch is blocked. This task is presentation-only.

## Task 3: Turn blocker cards into clear tasks

**Files:**
- Modify: `frontend/src/components/ReviewSection.tsx`

- [ ] **Step 1: Rewrite the blockers section heading and supporting copy**

Target language:

- heading: `Resolve before launch`
- copy: one sentence stating that the preview found setup issues requiring input before migration can start

- [ ] **Step 2: Add a small type label or kicker to each conflict card**

Use conflict-type labels such as:

- `Custom field`
- `Folder mapping`

This should appear before the task title.

- [ ] **Step 3: Rewrite custom-field conflict titles as actions**

Replace raw `h3` headings like:

```text
field_1
```

with task-shaped headings like:

```text
Map source field "field_1"
```

Keep the raw key visible in the title because it is still the identifier the user may need, but stop using it as the entire heading.

- [ ] **Step 4: Rewrite folder conflict titles as decisions**

Use a pattern like:

```text
Choose destination folder for "Wishlist"
```

so the user understands the decision before reading the body.

- [ ] **Step 5: Tighten body copy, placeholders, and button text**

Examples:

- custom-field placeholder: `Destination field name`
- custom-field button: `Use same name`
- folder select empty option: `Choose destination folder`

Keep the copy short and explicit.

## Task 4: Adjust review-surface styling to support the new hierarchy

**Files:**
- Modify: `frontend/src/styles/features/review.css`

- [ ] **Step 1: Keep the summary strip as a structural evidence band**

Use the existing ruled, compact language. Do not convert the strip into standalone dashboard cards.

- [ ] **Step 2: Add styling for any new stale-preview explainer**

It should read as supporting guidance, not as another major panel.

- [ ] **Step 3: Add hierarchy inside conflict cards**

Style for:

- conflict-type kicker
- action-focused title
- short body copy
- controls

The visual hierarchy should make the title and required action obvious at a glance.

- [ ] **Step 4: Preserve compact density**

Do not introduce oversized spacing, soft marketing-card treatment, or a generic SaaS look.

## Task 5: Verify edge states and durable docs

**Files:**
- Modify: `docs/design-system.md` only if a durable rule changed
- Modify: `.impeccable.md` only if a durable rule changed

- [ ] **Step 1: Manually verify these review states**

Check:

- no preview yet
- current preview
- stale preview
- one custom-field blocker with a raw key like `field_1`
- one folder blocker
- multiple mixed blockers

- [ ] **Step 2: Run the frontend verification command**

Run:

```bash
npm run build --prefix frontend
```

Expected: successful production build with no TypeScript or CSS errors.

- [ ] **Step 3: Update durable design docs only if the implementation changes shared rules**

If the work only changes local phrasing and local layout, skip doc edits.

- [ ] **Step 4: Prepare a concise review summary**

Document:

- what changed in the summary strip
- what changed in blockers wording
- which review states were manually checked
- build result
