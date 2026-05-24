# GSB Bodekasse Constitution

## 1. Purpose

This document is the authoritative source of truth for product principles, architecture boundaries, and non-negotiable rules for this repository.

Use this document to protect long-term consistency as features, specs, and implementation details evolve.

`README.md` is intentionally onboarding-focused and high-level. Business-critical and implementation-governance rules belong here.

## 2. Scope

This constitution applies to:
- Product direction
- Architecture and project structure
- Domain integrity rules
- Security and permission invariants
- Documentation precedence

Implementation-level details may live in other docs, but they must not conflict with this document.

## 3. Documentation Precedence

When sources differ, use this order:
1. constitution.md (this file)
2. .github/copilot-instructions.md
3. .github/instructions/*.instructions.md
4. docs/specs/**
5. README.md

If any lower-priority document conflicts with this constitution, the constitution wins.

## 4. Product Philosophy (Non-Negotiable)

- This is culture software for social club life, not accounting software.
- UX should support social transparency, low friction, and mobile usage first.
- Features must preserve Danish product language and context.

## 5. Architecture Guardrails (Non-Negotiable)

- Stack baseline: Vite + React + TypeScript + TailwindCSS v4.
- Code organization is feature-based under src/features/.
- Styling follows vertical-slice architecture:
  - Keep feature styling co-located in its owning feature folder.
  - Avoid central style files except app-wide foundation styling.
- Domain types are centralized in src/types/domain.ts.
- Permission checks must use helpers in src/lib/permissions.ts.

## 6. Domain Integrity Rules (Non-Negotiable)

- Fines are always scoped to an active season.
- Every mutation (fine, payment, member) must create an ActivityLog entry.
- Fines are soft-deleted only (set deletedAt); never hard-delete fines.
- Only one season per team can be active at the same time.
- Payment transitions follow: unpaid -> pending -> approved (or disputed).

## 7. Security and Permission Invariants (v1 Baseline)

- Firestore writes are admin-only by default.
- Team membership roles are limited to Member and Admin.
- Super-admin is a separate user-level flag used only for explicitly scoped cross-team capabilities.
- UI and logic must not hardcode role strings when permission helpers exist.

## 8. Delivery and Quality Rules

- All features must have a feature spec before implementation.
- Mobile-first is mandatory.
- Core screen behavior must be validated at 430px width and below.
- Ship changes with synchronized version and patch notes updates.

## 9. Developer Workflow Rules

Before implementation work, use this order:
1. Read constitution.md for non-negotiable constraints.
2. Read .github/copilot-instructions.md for global implementation policy.
3. Read matching .github/instructions/*.instructions.md files for scoped rules.
4. Read the relevant feature spec in docs/specs/features/.

Before making changes, sync your local repository against main:
- Run `git pull origin main` from the repo root to ensure you are working from the latest code.
- If local changes prevent pulling, stop and resolve with the user before implementation.

During implementation:
- Do not violate domain invariants defined in this document.
- Use permission helpers instead of hardcoded role checks when helpers exist.
- Keep architectural boundaries intact (feature-based structure and vertical-slice styling).

For visual UI changes:
- Validate the affected UI with Playwright tooling and capture screenshots as evidence.
- Include screenshot evidence when reporting completion so visual regressions are traceable.

## 10. Constitution Change Control

- Any change to a non-negotiable rule must update constitution.md first.
- Related guidance in README and instruction files must be aligned in the same change.
- If implementation conflicts with this constitution, raise and resolve the conflict explicitly instead of silently following old patterns.
