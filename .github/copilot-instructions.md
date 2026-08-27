# GSB Bødekasse – Project Guidelines

## Documentation Precedence (Mandatory)

Agents must consult `constitution.md` before planning or implementing changes.

If documentation conflicts, resolve precedence in this order:
1. `constitution.md`
2. `.github/copilot-instructions.md`
3. `.github/instructions/*.instructions.md`
4. `docs/specs/**`
5. `README.md`

`README.md` is for onboarding and navigation; it is not the source of truth for non-negotiable rules.

## What This Project Is

A **social-first sports club fine platform** ("bødekasse") for Danish badminton clubs.  
This is **culture software**, not accounting software. Keep that philosophy in all decisions.

## Architecture

- **Vite 5 + React + TypeScript + TailwindCSS v4**
- Feature-based folder structure under `src/features/`
- Vertical-slice styling architecture: keep styling co-located with each feature under `src/features/<feature>/`; avoid central style files except app-wide foundation styles
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

Canonical domain and permission invariants are defined in `constitution.md`.

When implementing from specs, always verify the resulting implementation remains consistent with `constitution.md`.

## Permissions

Always use helpers from `src/lib/permissions.ts` — never hardcode role strings in UI or logic.

Team membership roles are limited to `member` and `admin`. All permissions are determined by a user's role within each team.

```ts
canAssignFines(role)      // admin only (v1 baseline)
canApprovePayments(role)  // admin only (v1 baseline)
canDeleteFines(role)      // admin only (v1 baseline)
canManageMembers(role)    // admin only
canManageSeasons(role)    // admin only
canManageProposals(role)  // admin only
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

## Agent Execution Workflow (Mandatory)

When an agent starts implementation work in this repository:

1. Sync with main before coding:
	- Run `git pull origin main` from the repository root.
	- If pull is blocked by local changes, pause and resolve with the user before proceeding.
2. Continue with constitution/spec/instruction reads and implementation.

## Visual Change Evidence (Mandatory)

For any feature or fix that changes visible UI/UX:

- Use Playwright tooling to validate the changed screens.
- Capture screenshots that show the implemented result (mobile width first, including 430px where relevant).
- Provide those screenshots as completion evidence in the final delivery/update.

If the visual flow requires admin privileges and no suitable test account is available:

- Pause and request a dedicated test user from the maintainer.
- Continue once credentials/claims are available.
- Never commit credentials or secrets to the repository.

Known test accounts for this repo:
- Member/admin flow test email: `copilot.test.20260519.1@example.com`
- Passwords are intentionally not stored in repo docs; use secure/local secret handling.

## Key Docs

- [Domain Entities](../docs/specs/domain/entities.md)
- [Feature Specs](../docs/specs/features/)
- [Flows](../docs/specs/flows/flows.md)
