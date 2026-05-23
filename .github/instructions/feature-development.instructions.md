---
description: "Use when implementing a feature, creating a new feature folder, building a React component inside src/features/, or wiring up state and logic for a feature. Covers component structure, permissions, Danish copy, and spec alignment."
applyTo: "src/features/**"
---

# Feature Implementation Rules

## Before you write any code

1. **Read the constitution** — review `constitution.md` for non-negotiable rules and architecture guardrails
2. **Read the spec** — open `docs/specs/features/F0XX-<name>.md` for the feature you are implementing
3. **Check domain types** — review `src/types/domain.ts` before creating any local interfaces
4. **Check permissions** — identify which roles can trigger the feature; use helpers from `src/lib/permissions.ts`

Team membership roles are limited to `member` and `admin`. `isSuperAdmin` is a separate user-level flag and should only be used for explicitly scoped cross-team capabilities.

## Component structure

Each feature folder is self-contained:

```
src/features/<feature-name>/
  <FeatureName>.tsx      # Main page/screen component
  <SubComponent>.tsx     # Supporting components (co-located)
  use<FeatureName>.ts    # Hook for state/data logic (if needed)
```

No barrel `index.ts` files unless there are 3+ exports.

## Vertical-slice styling rules

- Keep feature styles co-located inside the owning feature folder in `src/features/<feature>/`.
- Prefer one feature-level stylesheet (for example `<feature>.css`) plus optional local component styles when needed.
- Do not import styles across feature boundaries (for example, Feature A importing css from Feature B).
- Shared global styling belongs only in app foundation files (such as `src/index.css` and `src/App.css`) and must stay generic.
- Feature styles must not redefine app-wide foundations (tokens, reset-like rules, typography defaults, body/html rules).
- If styling is reused by multiple features, promote it to a shared UI primitive/component instead of sharing raw css files.

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

Mutations to Fine, Payment, and Membership must produce an ActivityLog entry. Document the `action` string used — match the action types defined in `docs/specs/domain/entities.md`.

## Acceptance criteria

After implementing, verify each acceptance criterion from the spec is met before considering the feature complete.
