---
description: "Review a feature spec for completeness, clarity, and alignment with domain rules. Returns a structured review with gaps and suggestions."
agent: agent
argument-hint: "Feature ID or spec filename to review (e.g. 'F002' or 'F002-bulk-fine-assignment')"
---

Review the following feature spec for the GSB Bødekasse project:

${input}

1. Find the spec file in `docs/specs/features/`
2. Read `docs/specs/domain/entities.md` and `.github/instructions/spec-writing.instructions.md`
3. Check the spec against these criteria:
   - All required sections present (Problem, Goal, Actors, Preconditions, Flow, Edge Cases, Acceptance Criteria)
   - Flow steps are explicit — each step has a clear actor (user or system)
   - Edge cases cover: empty states, permission violations, duplicate operations, partial failures
   - Acceptance criteria are concrete and testable (no vague language)
   - Domain terms match the entities defined in `docs/specs/domain/entities.md`
   - ActivityLog entries are mentioned where mutations occur
4. Return a structured review: what's complete, what's missing, suggested improvements
