# Issue: F016 - Implement Bulk Member Fine Operations

Summary
---
Bulk fine **assignment**, **delete**, and **restore** are fully implemented with progress UI. Missing functionality: bulk **adjust** (modify existing fines) and enhanced **undo semantics** with time-window rollback.

✅ **Already Implemented**
---
- ✅ Bulk assign fines to multiple members (F002 - complete)
- ✅ Bulk soft-delete fines with `bulkSoftDeleteFines` helper
- ✅ Bulk restore deleted fines with `bulkRestoreFines` helper
- ✅ Progress UI component with percentage tracking (`BulkOperationProgress`)
- ✅ Batched Firestore operations (450 ops/batch, handles 100+ members)
- ✅ Per-item error handling (partial success support)
- ✅ ActivityLog entries for all bulk operations
- ✅ Duplicate detection with override option for assignments

❌ **Missing Work**
---
- ❌ **Bulk adjust**: Change amount or fine rule for multiple existing fines
  - Add `bulkAdjustFines(teamId, fineIds, updates, actorId)` in `src/lib/firestore/fines.ts`
  - Add UI in relevant feature (likely AssignFine or TeamOverview)
  - Write ActivityLog entries for adjustments
- ❌ **Enhanced undo semantics**: Time-window based rollback
  - Track bulk operations for rollback within configurable time window (e.g., 5 minutes)
  - Add UI "Undo" button that appears after bulk operations
  - Store operation metadata for reversal (what was changed, by whom, when)
  - Implement automatic expiry of undo capability after time window

Acceptance criteria
---
- Bulk-adjust function operates correctly with atomic updates where possible
- UI shows undo option immediately after bulk operations
- Undo capability expires after time window and button disappears
- ActivityLog records both bulk operations and their undos
- Tests cover bulk-adjust and undo flows

References
---
- `src/features/fines/AssignFine.tsx`
- `src/lib/firestore/fines.ts`
- `src/components/BulkOperationProgress.tsx`
- `docs/specs/features/F016-bulk-member-fine-operations.md`
