# Remove Step 1 Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Step 1 left-sidebar panel, promote the source grid to full width, and move the Copy/Move workflow toggle into the topbar.

**Architecture:** The Step 1 panel is removed entirely — `planName` is hardcoded, `plannerCollapsed` is deleted, and `workflowMode` is surfaced as a compact topbar toggle. The two-column `shell-grid` becomes a single-column layout with `shell-right` renamed to `shell-content`. Step-number labels are removed from Step 2 and Step 3 section headers. Account controls now live with the Source and Destination sections they affect instead of a shared topbar dropdown.

**Tech Stack:** React 18, TypeScript, CSS custom properties, Vite, lucide-react

> **Ordering note:** Execute Tasks 4 and 5 (hook cleanup) before Task 2 (App.tsx JSX removal) if you want clean TypeScript between commits — Task 2 removes `planName` from the `useWorkspaceState` call, which requires Task 5's type change to already be in place.

---

## File Map

| File                                                 | Change                                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `frontend/src/styles/layout.css`                     | Remove `.shell-left`, rename `.shell-right` → `.shell-content`, collapse grid to single column |
| `frontend/src/App.tsx`                               | Remove Step 1 JSX, add topbar toggle, remove `planName`/`plannerCollapsed` destructuring       |
| `frontend/src/hooks/useMigrationPlan.ts`             | Remove `planName`/`setPlanName` state, hardcode `name`                                         |
| `frontend/src/hooks/useWorkspaceState.ts`            | Remove `planName` param, remove `plannerCollapsed` state                                       |
| `frontend/src/components/SourceSelectionSection.tsx` | Remove `section-label` "Step 2"                                                                |
| `frontend/src/components/ReviewSection.tsx`          | Remove `section-label` "Step 3"                                                                |

---

### Task 1: Update CSS layout

**Files:**

- Modify: `frontend/src/styles/layout.css:21-35` (grid, shell-left, shell-right)
- Modify: `frontend/src/styles/layout.css:145-154` (960px breakpoint)
- Modify: `frontend/src/styles/layout.css:165-170` (760px media query)

- [ ] **Step 1: Replace `.shell-grid`, delete `.shell-left`, rename `.shell-right`**

Replace the current block (lines 21–35):

```css
.shell-grid {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) minmax(0, 2.15fr);
  min-height: calc(100vh - 4.75rem);
}

.shell-left {
  border-right: var(--border-grid-strong);
  padding: var(--shell-padding);
}

.shell-right {
  padding: var(--shell-padding) var(--shell-padding) var(--space-3xl)
    var(--shell-padding-right);
}
```

With:

```css
.shell-grid {
  min-height: calc(100vh - 4.75rem);
}

.shell-content {
  padding: var(--shell-padding) var(--shell-padding) var(--space-3xl)
    var(--shell-padding-right);
}
```

- [ ] **Step 2: Remove shell-left from the 960px breakpoint**

Replace the current 960px block (lines 145–153):

```css
@media (max-width: 960px) {
  .shell-grid {
    grid-template-columns: 1fr;
  }

  .shell-left {
    border-right: none;
    border-bottom: var(--border-subtle);
  }
}
```

With (grid is already single column, no shell-left to handle):

```css
@media (max-width: 960px) {
  .shell-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Update `.shell-right` reference in the 760px media query**

In the 760px block, change:

```css
.topbar,
.shell-left,
.shell-right {
  padding-left: var(--shell-padding);
  padding-right: var(--shell-padding-right);
}
```

To:

```css
.topbar,
.shell-content {
  padding-left: var(--shell-padding);
  padding-right: var(--shell-padding-right);
}
```

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/styles/layout.css"
git commit -m "Simplify shell grid to single column, rename shell-right to shell-content"
```

---

### Task 2: Remove Step 1 panel from App.tsx JSX

**Files:**

- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Remove `planName`, `setPlanName`, `plannerCollapsed`, `setPlannerCollapsed` from destructures**

In the `useMigrationPlan` destructure (around line 81), remove:

```ts
    planName,
    setPlanName,
```

In the `useWorkspaceState` destructure (around line 128), remove:

```ts
    plannerCollapsed,
    setPlannerCollapsed,
```

In the `useWorkspaceState` call args (around line 167), remove:

```ts
    planName,
```

- [ ] **Step 2: Remove the entire Step 1 aside block**

Delete this entire block (lines ~355–430):

```jsx
      <section className="shell-grid">
        <aside className="shell-left">
          <section className="rail-section">
            ...
          </section>
        </aside>

        <section className="shell-right">
```

Replace the opening of the content area with:

```jsx
      <section className="shell-grid">
        <section className="shell-content">
```

And remove the closing `</aside>` that corresponds to the deleted aside. The closing `</section>` for `shell-grid` and the closing `</section>` for `shell-content` (formerly `shell-right`) remain.

- [ ] **Step 3: Remove `StatBlock` from the ui import**

Change line 17 from:

```ts
import { Field, StatBlock } from "./components/ui";
```

To:

```ts
import { Field } from "./components/ui";
```

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/App.tsx"
git commit -m "Remove Step 1 panel from layout, promote source grid to full width"
```

---

### Task 3: Add Copy/Move toggle to topbar

**Files:**

- Modify: `frontend/src/App.tsx:278-286` (topbar-actions)

- [ ] **Step 1: Insert the workflow toggle into `.topbar-actions`**

Inside `.topbar-actions`, after the closing `</span>` of `.hero-status` and before the destructive action button, add:

```jsx
<div className="toggle-group">
  <button
    className={`toggle-option${workflowMode === "copy" ? " active" : ""}`}
    onClick={() => setWorkflowMode("copy")}
  >
    <Copy size={13} />
    Copy
  </button>
  <button
    className={`toggle-option${workflowMode === "move" ? " active" : ""}`}
    onClick={() => setWorkflowMode("move")}
  >
    <ArrowRightLeft size={13} />
    Move
  </button>
</div>
```

`Copy`, `ArrowRightLeft`, `workflowMode`, and `setWorkflowMode` are already imported/destructured — no additional imports needed.

- [ ] **Step 2: Commit**

```bash
git add "frontend/src/App.tsx"
git commit -m "Add Copy/Move workflow toggle to topbar"
```

---

### Task 4: Remove planName from useMigrationPlan

**Files:**

- Modify: `frontend/src/hooks/useMigrationPlan.ts`

- [ ] **Step 1: Remove the `planName` state declaration**

Delete line 29:

```ts
const [planName, setPlanName] = useState("Digital archive split");
```

- [ ] **Step 2: Hardcode `name` in `currentPlan`**

Change line 55 from:

```ts
      name: planName.trim() || "Untitled plan",
```

To:

```ts
      name: "Untitled plan",
```

- [ ] **Step 3: Remove `planName` from the `currentPlan` deps array**

In the `useMemo` deps array (around line 63–73), remove `planName,`.

- [ ] **Step 4: Remove `planName` and `setPlanName` from the return object**

In the return block (around line 146–147), remove:

```ts
    planName,
    setPlanName,
```

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/hooks/useMigrationPlan.ts"
git commit -m "Remove planName state from useMigrationPlan, hardcode plan name"
```

---

### Task 5: Remove planName and plannerCollapsed from useWorkspaceState

**Files:**

- Modify: `frontend/src/hooks/useWorkspaceState.ts`

- [ ] **Step 1: Remove `planName` from the input type**

Delete line 51 from the `WorkspaceStateInput` type:

```ts
planName: string;
```

- [ ] **Step 2: Remove `planName` from the function destructure**

Delete `planName,` from the function parameter destructure (around line 79).

- [ ] **Step 3: Update `handleSavePreset` to not use `planName`**

Change line 463 from:

```ts
const trimmedName = presetName.trim() || planName.trim();
```

To:

```ts
const trimmedName = presetName.trim();
```

- [ ] **Step 4: Remove `plannerCollapsed` / `setPlannerCollapsed` state**

Delete line 104:

```ts
const [plannerCollapsed, setPlannerCollapsed] = useState(false);
```

- [ ] **Step 5: Remove `plannerCollapsed` / `setPlannerCollapsed` from the return object**

Find the return block (around line 529) and remove:

```ts
    plannerCollapsed,
    setPlannerCollapsed,
```

- [ ] **Step 6: Commit**

```bash
git add "frontend/src/hooks/useWorkspaceState.ts"
git commit -m "Remove planName and plannerCollapsed from useWorkspaceState"
```

---

### Task 6: Remove step-number labels

**Files:**

- Modify: `frontend/src/components/SourceSelectionSection.tsx:162`
- Modify: `frontend/src/components/ReviewSection.tsx:115`

- [ ] **Step 1: Remove "Step 2" label from SourceSelectionSection**

In `frontend/src/components/SourceSelectionSection.tsx`, delete line 162:

```jsx
<div className="section-label">Step 2</div>
```

- [ ] **Step 2: Remove "Step 3" label from ReviewSection**

In `frontend/src/components/ReviewSection.tsx`, delete line 115:

```jsx
<div className="section-label">Step 3</div>
```

- [ ] **Step 3: Commit**

```bash
git add "frontend/src/components/SourceSelectionSection.tsx" "frontend/src/components/ReviewSection.tsx"
git commit -m "Remove step-number labels from section headers"
```

---

### Task 7: Build verification

- [ ] **Step 1: Run the frontend build**

```bash
npm run build --prefix frontend
```

Expected: build completes with no TypeScript or bundle errors. Any type errors indicate a missed reference to `planName`, `setPlanName`, `plannerCollapsed`, or `setPlannerCollapsed` — fix the reference and re-run.

- [ ] **Step 2: Smoke-check visually**

Start the dev server: `npm run dev --prefix frontend`

Confirm:

1. Source grid spans full width with no left sidebar
2. Copy/Move toggle appears in the topbar alongside the global status surface
3. Toggling Copy ↔ Move in the topbar updates state (the active button highlights)
4. "Step 2" label is gone from the source selection header
5. "Step 3" label is gone from the review section header
6. No "Plan name" input anywhere in the UI
