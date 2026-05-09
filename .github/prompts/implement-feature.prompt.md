---
description: "Implement a feature from its spec. Reads the spec, builds the React components, and verifies acceptance criteria."
agent: agent
argument-hint: "Feature ID or name to implement (e.g. 'F004' or 'Team Overview')"
---

Use the `feature-implementer` agent to implement the following feature:

${input}

Steps to follow:
1. Find and read the matching spec in `docs/specs/features/`
2. Check `src/types/domain.ts` and `src/lib/permissions.ts` before writing code
3. Read `.github/instructions/feature-development.instructions.md`
4. Implement inside the correct `src/features/<name>/` folder
5. Run `npx tsc --noEmit` and confirm zero errors
6. Verify every acceptance criterion from the spec is met
