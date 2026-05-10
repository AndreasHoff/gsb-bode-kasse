---
description: "Use when implementing a feature, creating a new feature folder, building a React component inside src/features/, or wiring up state and logic for a feature. Covers component structure, permissions, Danish copy, and spec alignment."
applyTo: "src/features/**"
---

# Feature Implementation Rules

## Before you write any code

1. **Read the spec** — open `docs/specs/features/F0XX-<name>.md` for the feature you are implementing
2. **Check domain types** — review `src/types/domain.ts` before creating any local interfaces
3. **Check permissions** — identify which roles can trigger the feature; use helpers from `src/lib/permissions.ts`

## Component structure

Each feature folder is self-contained:

```
src/features/<feature-name>/
  <FeatureName>.tsx      # Main page/screen component
  <SubComponent>.tsx     # Supporting components (co-located)
  use<FeatureName>.ts    # Hook for state/data logic (if needed)
```

No barrel `index.ts` files unless there are 3+ exports.

## Mobile-first requirement (mandatory)

- Build all feature UI mobile-first.
- Treat 430px as the maximum target viewport width for core screen layouts.
- Verify layouts and interactions at 430px and below before desktop polish.
- Prevent horizontal scrolling at mobile widths.
- On wider viewports, keep the primary app container constrained to mobile width unless the active feature spec explicitly states otherwise.

## Permissions in UI

```tsx
// Always use helpers — never inline role strings
import { canAssignFines } from "../../lib/permissions";

if (!canAssignFines(currentUser.role)) return null;
```

## Danish UI copy

The app is in Danish. Use these conventions:

| Concept     | Danish copy            |
|-------------|------------------------|
| Fine        | Bøde / bøder           |
| Season      | Sæson                  |
| Approve     | Godkend                |
| Pending     | Afventer godkendelse   |
| Paid        | Betalt                 |
| Delete      | Slet                   |
| Undo        | Fortryd                |
| Member      | Medlem / spillere      |
| Overview    | Oversigt               |

## Formatting helpers

```ts
import { formatAmount, formatRelativeTime } from "../../lib/utils";

formatAmount(50)              // → "50 kr."
formatRelativeTime(isoStr)    // → "3 min. siden"
```

## ActivityLog

Every mutation must produce an ActivityLog entry. Document the `action` string used — match the action types defined in `docs/specs/domain/entities.md`.

## Acceptance criteria

After implementing, verify each acceptance criterion from the spec is met before considering the feature complete.
