# Issue: F016 - Implement Bulk Member Fine Operations

Summary
---
Bulk assign is partially implemented but the spec requires bulk-remove/adjust, progress UI, and undo semantics.

Missing work
---
- Implement bulk-remove and bulk-adjust helpers in `src/lib/firestore/fines.ts` with safe, atomic patterns where possible
- Add progress UI for long-running bulk operations (show percentage / items processed)
- Implement undo semantics (e.g., track operations for rollback within a time window)
- Add tests covering bulk-remove/adjust and undo flows

Acceptance criteria
---
- Bulk-remove/adjust functions operate correctly and can be undone
- UI shows progress and confirmation/undo options
- ActivityLog records bulk operations

References
---
- `src/features/fines/AssignFine.tsx`
- `src/lib/firestore/fines.ts`
- `docs/specs/features/F016-bulk-member-fine-operations.md`
