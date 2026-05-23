---
description: "Create a new feature spec from a rough description. Produces a complete F00N spec file in docs/specs/features/."
agent: agent
argument-hint: "Describe the feature you want to spec out (e.g. 'Member notifications when a fine is assigned')"
---

Use the `spec-writer` agent to create a new feature spec based on the following description:

${input}

Make sure to:
1. Check `docs/specs/features/` for the next available F number
2. Follow the spec format from `.github/instructions/spec-writing.instructions.md`
3. Read `docs/specs/domain/entities.md` before writing so the spec uses the correct domain terms
4. Add the new spec to the feature table in `README.md`
