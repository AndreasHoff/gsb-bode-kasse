# GSB Bødekasse – Project Guidelines

## What This Project Is

A **social-first sports club fine platform** ("bødekasse") for Danish badminton clubs.  
This is **culture software**, not accounting software. Keep that philosophy in all decisions.

## Architecture

- **Vite 5 + React + TypeScript + TailwindCSS v4**
- Feature-based folder structure under `src/features/`
- Domain types in `src/types/domain.ts` — always consult before adding new types
- Permission logic in `src/lib/permissions.ts` — all role checks go here
- MobilePay integration in `src/lib/utils.ts`

## Spec-Driven Development

**All features have a spec before implementation.**  
Specs live in `docs/specs/features/` and follow the F001–F00N naming convention.  
Before implementing a feature, read its spec. Before adding a feature, write one.

- Domain entities are defined in `docs/specs/domain/entities.md`
- User flows are documented in `docs/specs/flows/flows.md`
- Each spec contains: Problem, Goal, Actors, Flow, Edge Cases, Acceptance Criteria

## Domain Rules (Non-Negotiable)

- Fines are always scoped to an active **Season**
- Every mutation (fine, payment, member) must produce an **ActivityLog** entry
- Fines are **soft-deleted** (set `deletedAt`), never hard-deleted
- Only one Season per team can be `isActive = true` at a time
- Payment status transitions: `unpaid` → `pending` → `approved` (or `disputed`)
- Current implementation baseline: Firestore writes are admin-only by default
- Role hierarchy: Player < Captain < Treasurer < Admin

## Permissions

Always use helpers from `src/lib/permissions.ts` — never hardcode role strings in UI or logic.

```ts
canAssignFines(role)      // admin only (v1 baseline)
canApprovePayments(role)  // admin only (v1 baseline)
canDeleteFines(role)      // admin only (v1 baseline)
canManageMembers(role)    // admin only
canManageSeasons(role)    // admin only
```

## Code Conventions

- Components are `.tsx`, utilities and types are `.ts`
- Each feature folder contains only files for that feature
- No shared state libraries yet — start with React state, evaluate when needed
- TailwindCSS v4: use `@import "tailwindcss"` in CSS, no config file needed
- Mobile-first is mandatory for all UI work
- Design and verify all screens at a maximum viewport width of 430px
- On larger screens, keep primary app content constrained to mobile width unless a spec explicitly requires otherwise
- Danish UI copy — the app is in Danish (`bøde`, `sæson`, `godkend`, etc.)
- Amounts are in DKK — use `formatAmount()` from `src/lib/utils.ts`
- Relative timestamps — use `formatRelativeTime()` from `src/lib/utils.ts`

## Shipping Rule — Versioning & Changelog

ALWAYS bump the app version and update the changelog when shipping a feature or fix. Never ship without both being updated:

1. `package.json` — bump the version (semver: patch for fixes, minor for features)
2. `docs/PATCH_NOTES.md` — add a new entry with version, date, and bullet points (in Danish)

In-app display of patch notes is deferred — to be designed and implemented later.

## Build & Dev

```bash
npm install       # Install dependencies
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npx tsc --noEmit  # Type-check only
```

## Key Docs

- [Domain Entities](../docs/specs/domain/entities.md)
- [Feature Specs](../docs/specs/features/)
- [Flows](../docs/specs/flows/flows.md)
