---
name: Copilot feature request
about: Plain-language feature request that Copilot can translate into spec/plan/tasks
title: "[Feature] "
labels: enhancement
assignees: Copilot
---

## What problem are you trying to solve?

Describe what feels hard, confusing, or missing today.

## What should happen instead?

Describe the desired behavior in plain language.

## Where in the app?

Which screen, section, or flow does this relate to?

## Example scenario

_Optional — fill in before handing off to Copilot._

Write 1-3 realistic examples of how this should work.

- Example 1:
- Example 2:

## Priority

- [ ] Nice to have
- [ ] Important
- [ ] Critical

## Platform impact (if known)

- [ ] Frontend UI only
- [ ] Requires a Firebase Cloud Function
- [ ] Firestore schema change needed
- [ ] Not sure

## Notes for Copilot (required behavior)

- Convert this issue into a spec under `docs/specs/features/` (F00N naming convention) before implementation.
- All UI copy must be in Danish.
- If a Cloud Function is needed, the implementation lives in `functions/src/index.ts`.
- Follow existing patterns in `src/lib/firestore/` for any new Firestore collections.