# Specs lifecycle

This folder contains feature specifications and their lifecycle states.

- `features/` — Active and in-progress specs. Use for work-in-progress designs.
- `done/` — Implemented and shipped specs. Move a spec here when the feature is delivered.
- `archived/` — Declined, withdrawn, or postponed specs. Keep for historical context.

Guidelines:

1. When implementing a spec from `features/`, copy it to `done/`, add frontmatter:

```
---
status: implemented
implemented_date: YYYY-MM-DD
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---
```

2. When declining a spec, move it to `archived/` and add frontmatter:

```
---
status: declined
status_date: YYYY-MM-DD
status_by: Team
reason: "Short reason for declining"
---
```

3. Keep `features/` focused on active work; `done/` documents what was implemented; `archived/` stores history.
