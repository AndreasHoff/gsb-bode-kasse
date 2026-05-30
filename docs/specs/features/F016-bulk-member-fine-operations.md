# F016 - Bulk Member Fine Operations

## Problem
Admins need to perform bulk actions (assign, remove, adjust) across many members.

## Goal
Provide bulk selection and operations with clear undo and confirmation steps.

## Acceptance Criteria
- Bulk assign/remove works
- Progress shown for long-running operations
- Actions recorded in ActivityLog

<!-- TODO: Partially implemented — `AssignFine` bulk-assign exists (see `src/features/fines/AssignFine.tsx`) and `src/lib/firestore/fines.ts` contains helpers, but missing:
- Bulk-remove/adjust helpers and atomic undo semantics
- Progress UI for long operations
- Tests covering bulk-remove/adjust and undo
--> 
