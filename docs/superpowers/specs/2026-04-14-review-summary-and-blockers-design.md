# Review Summary and Blockers Design

**Date:** 2026-04-14

## Goal

Make the Review and launch surface easier to scan at the exact moment users decide whether a migration is safe to start. The summary strip should report concrete state, not abstract interpretation. The blockers section should preserve a dense operator feel while making each blocker card read like a clear task.

## Context

The current review summary strip mixes two kinds of information:

- current UI selection count
- counts from the last generated preview

Those values are useful, but they become misleading when phrased as interpreted coverage. A sentence like "Preview covers 98.7% of selected releases" sounds like a safety or inclusion guarantee even though it may only mean the preview is stale.

The current blockers section has a separate clarity problem. Custom-field conflict cards use the raw field key as the card heading, which makes labels such as `field_1` read like unexplained internal identifiers instead of actionable tasks.

## Design Direction

Use a hybrid blockers pattern:

- keep the section visually compact, structural, and operator-oriented
- make each blocker card title instructional, so the action is obvious before the supporting copy is read

This preserves the product's power-tool tone without forcing the user to decode internal labels.

## Summary Strip Principles

1. Show concrete counts, not derived interpretation, by default.
2. Only explain mismatches when there is something specific to explain.
3. Use explicit stale-preview language instead of abstract percentage language.
4. Preserve the current square, ruled, exposed-grid visual direction rather than switching to generic metric cards.

## Summary Strip Content

The strip should prioritize three questions:

1. How many releases are selected right now?
2. How many releases are represented in the last preview?
3. Is there duplicate risk on the destination?

Recommended metric set:

- `Current selection`
- `Last preview`
- `Duplicates on destination`

Recommended behavior:

- When the preview is current, do not add an interpretation sentence below the strip.
- When the preview is stale, add explicit copy such as: `Preview is out of date. Last preview included 861 releases; 872 are now selected. Refresh preview.`
- When duplicates are zero, keep that metric quiet.
- When duplicates are non-zero, promote it visually so the risk is harder to miss.

## Blockers Section Principles

1. The section header should state the blocking state in plain language.
2. Each card should answer `what is wrong`, `what object is affected`, and `what to do next`.
3. Card titles should read like tasks, not data labels.
4. Raw identifiers may appear as supporting detail, but they should not be the primary heading unless the heading adds task context around them.

## Blockers Section Content

Recommended section framing:

- section heading: `Resolve before launch`
- section copy: one line explaining that the preview found setup issues requiring input before migration can start

Recommended custom-field card framing:

- kicker: `Custom field`
- title: `Map source field "field_1"`
- body: explain that the source field has no destination mapping yet and that the user can enter the destination field name or keep the same name

Recommended folder-mapping card framing:

- kicker: `Folder mapping`
- title: `Choose destination folder for "Wishlist"`
- body: explain that multiple destination folders share the same name and the user must choose the intended target

## Audit Scope

The implementation should audit the following review-blockers elements for clarity:

- section heading
- section supporting copy
- card title
- body copy
- input label and placeholder
- button text
- grouped-conflicts note

The audit should specifically test:

- stale preview with mismatched counts
- one blocker and multiple blockers
- custom-field blockers with raw identifiers such as `field_1`
- folder blockers with ambiguous duplicate folder names

## Constraints

- Prefer frontend-only changes.
- Do not add backend work unless the frontend truly lacks any human-readable field label beyond a raw key and the resulting UI remains unacceptably opaque.
- Keep launch authority logic in existing app state; this pass is about presentation and copy, not changing workflow behavior.
