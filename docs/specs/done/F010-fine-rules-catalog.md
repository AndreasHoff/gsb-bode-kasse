---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F010 - Fine Rules Catalog

## Problem
Admins need a shared catalog of canonical fine rules to speed assignment and ensure consistency.

## Goal
Allow admins to create, edit, and select from a catalog of fine rules (title, amount, default note).

## Actors
- Admin

## Flow

1. Admin opens "Fine Rules" catalog
2. List of rules with search and filters
3. Admin can create/edit/delete rules
4. Rules available when assigning a fine (quick-select)

## Acceptance Criteria
- CRUD for rules works
- Rules selectable during fine assignment
- Versioning metadata visible (author, updatedAt)
