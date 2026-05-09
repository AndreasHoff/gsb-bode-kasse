---
description: "Use when working with domain types, adding new entities, extending existing interfaces, or reviewing the data model. Covers all types in src/types/domain.ts and their business rules."
applyTo: "src/types/**"
---

# Domain Type Rules

The canonical entity definitions live in `docs/specs/domain/entities.md`. Read that first.

## Non-negotiable constraints

- Never add a field to an entity without a clear domain justification
- `Fine` uses **soft delete** — always include `deletedAt?: string`, never add a hard-delete path
- `Payment` status is a strict enum: `"unpaid" | "pending" | "approved" | "disputed"` — no other values
- `Season.isActive` — only one per team can be `true` at a time; enforce this at the mutation layer
- `ActivityLog` entries are **immutable** — no update or delete operations allowed on them

## Adding a new entity type

1. Check `docs/specs/domain/entities.md` — is it already modeled?
2. Add the interface to `src/types/domain.ts` in alphabetical order
3. Update `docs/specs/domain/entities.md` with the new entity's table and business rules
4. Add a corresponding `ActivityLog` action string if the entity will be mutated

## ID fields

All `id` fields are `string` (UUIDs from the backend). Never use `number` IDs.

## Timestamps

All timestamps are ISO 8601 strings (`string`), not `Date` objects. Format with `formatRelativeTime()` from `src/lib/utils.ts`.
