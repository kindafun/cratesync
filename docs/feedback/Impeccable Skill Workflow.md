---
title: Impeccable Skill Workflow
type: note
permalink: discogs-migration/feedback/impeccable-skill-workflow
tags:
- workflow
- impeccable
- feedback
---

# Impeccable Skill Workflow

The user improves the frontend through named `/impeccable` skill runs such as `/delight`, `/harden`, `/normalize`, `/optimize`, `/adapt`, `/quieter`, `/polish`, and `/extract`.

Each run should stay tightly scoped to the skill's intent instead of bundling unrelated cleanup.

## How to apply

- Frame improvement suggestions as a skill run when that framing helps the user choose the right kind of change.
- Do not proactively refactor or add features outside the selected skill's scope.
- Keep each skill run focused enough to justify a single coherent commit.
- Update the canonical docs when a skill run changes durable frontend behavior or design direction, especially [docs/design-system.md](../design-system.md) and [.impeccable.md](../../.impeccable.md).
