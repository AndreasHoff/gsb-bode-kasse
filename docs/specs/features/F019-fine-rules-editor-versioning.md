# F019 - Fine Rules Editor & Versioning

## Problem
Changes to fine rules need history and the ability to revert.

## Goal
Add versioning for fine rules with an edit history and revert capability.

## Acceptance Criteria
- Every edit creates a version entry
- Admins can view and revert to previous versions
- Changes produce ActivityLog entries

<!-- TODO: Not implemented in code — add versions subcollection and revert API in `src/lib/firestore/fineRules.ts` and add UI. -->
