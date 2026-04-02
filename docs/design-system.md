---
title: design-system
type: note
permalink: discogs-migration/design-system
---

# CrateSync Design System

## Direction
- Editorial control surface, not generic SaaS dashboard.
- High-contrast serif display typography over dense operational data.
- Warm amber is the primary accent; green is reserved for success/safe states; red is reserved for destructive/error states.

## Core Tokens

### Color
- `--color-bg`: app background
- `--color-surface`, `--color-surface-raised`, `--color-surface-soft`: layered dark surfaces
- `--color-rule`, `--color-rule-strong`: dividers and borders
- `--color-ink`, `--color-muted`, `--color-faint`: text hierarchy
- `--color-accent`: primary action and highlight color
- `--color-success`, `--color-danger`: semantic state colors

### Typography
- `--font-ui`: all interface text
- `--font-display`: headings, account names, stat numerals
- `--text-label`: metadata, labels, table headers
- `--text-meta`: secondary operational copy
- `--text-body`: standard body copy
- `--text-title-sm`, `--text-title-md`, `--text-display`: section and hero scales

### Spacing
- Base spacing scale:
  - `--space-2xs`: 4px
  - `--space-xs`: 8px
  - `--space-sm`: 12px
  - `--space-md`: 16px
  - `--space-lg`: 24px
  - `--space-xl`: 32px
  - `--space-2xl`: 40px
  - `--space-3xl`: 48px
- Semantic spacing:
  - `--shell-padding`: page gutters
  - `--section-gap`: distance between major sections
  - `--section-divider-space`: top padding after a divider
  - `--stack-tight`, `--stack-sm`, `--stack-md`, `--stack-lg`, `--stack-xl`: vertical rhythm inside components
  - `--inline-gap-sm`, `--inline-gap-md`, `--inline-gap-lg`: horizontal rhythm for actions/chips/toolbars

### Radius
- `--radius-sm`: form controls
- `--radius-md`: cards, panels, tables, alerts
- `--radius-pill`: chips, buttons, badges

## Spacing Rules
- Use semantic spacing tokens first. Reach for raw spacing tokens only when introducing a new pattern.
- Major layout transitions should use `--section-gap` and `--section-divider-space`, not ad hoc `margin-top` values.
- Form stacks should use `--stack-lg`; tighter metadata groups can use `--stack-sm` or `--stack-md`.
- Tables, cards, alerts, and events should share the same medium radius and similar internal padding to feel like one system.
- Buttons and inputs should share `--control-height` and control padding.

## Component Rules
- Top bar, left rail, and right canvas should inherit shell padding tokens instead of local custom padding.
- Display serif is for emphasis only: hero heading, section titles where needed, account names, stat numerals, and conflict card titles.
- Metadata labels should always use `--text-label` with uppercase tracking.
- Use amber for primary actions and emphasis. Do not use green for primary CTAs.
- Success, warning, and danger colors should appear only in status-bearing elements.

## When Extending
- Add new tokens in `frontend/src/styles.css` only when they are reusable across at least two components.
- Prefer semantic names like `--section-gap` or `--control-height` over one-off intentless values.
- If a new component needs spacing that the existing semantic scale cannot express cleanly, add a new semantic token and document it here.