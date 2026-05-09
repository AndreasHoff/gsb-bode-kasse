---
description: "Use when writing a new feature spec, updating an existing spec, reviewing a spec for completeness, or planning a new feature. Covers the F00N naming convention, required spec sections, and acceptance criteria format."
---

# Spec Writing Rules

Specs live in `docs/specs/features/` and use the `F00N-<kebab-name>.md` naming convention.

## Required sections

Every spec must contain all of the following:

```markdown
# F0XX - Feature Name

## Problem
One or two sentences. What pain does this solve?

## Goal
What the feature achieves when done. One sentence.

## Actors
Which roles interact with this feature (Player, Captain, Treasurer, Admin).

## Preconditions
What must be true before this flow can start.

## Flow
Numbered steps. Each step is a single action by one actor or the system.

## Edge Cases
Bullet list. What can go wrong? What are the boundary conditions?

## Acceptance Criteria
Bullet list. Concrete, testable statements. Each starts with a verb.
```

## Numbering

- Check `docs/specs/features/` for the highest existing F number
- Increment by 1 for each new spec
- Never reuse a number, even if a spec is removed

## Writing style

- **Problem** — describe the user's frustration, not the technical gap
- **Flow** — alternate between actor and system steps; be explicit about what the system does
- **Edge cases** — include: empty states, permission violations, network failures, duplicate operations
- **Acceptance criteria** — must be verifiable; avoid vague terms like "works correctly" or "looks good"

## Linking

After creating a spec, add a row to the feature table in `README.md`.

## Example acceptance criterion

```
- Fine appears in team overview immediately after assignment
- ActivityLog entry with action "fine.assigned" is created
- Operation fails atomically: all users fined or none
```
