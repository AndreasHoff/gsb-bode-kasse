# F016 - Bulk Member & Fine Operations

## Summary
Provide administrators with safe, auditable bulk operations for members and fines: bulk assign fines, bulk adjust balances, bulk import members, and dry-run previews. The feature must include previews, validation, and per-item error reporting.

## Problem
Day-to-day club admin tasks often require applying the same fine or adjustment to many members (e.g., mass attendance fines, league fees). Performing these operations one-by-one is slow and error-prone.

## Goal
- Allow admins to perform bulk operations with a preview and rollback plan.
- Provide CSV import/export for member data and bulk operations with validation.
- Ensure all operations are transactional per-item and batched to avoid long-running transactions.

## Actors
- Admin
- System (batch processor / Cloud Function)

## Supported operations
- Bulk assign fine (apply a selected `FineRule` to a list of members)
- Bulk custom adjustments (credit/debit specific amounts per member)
- Bulk import members (create or update member records from CSV)
- Bulk delete/undo (soft-delete) operations for a limited time window

## UI / Screens
- Bulk Operations landing screen with action cards (Assign Fine, Adjust Balances, Import Members)
- CSV upload flow: validate → preview → confirm → process
- Progress UI: shows per-row result (success/failure) and error messages

## Flows

Bulk assign fines (CSV)
1. Admin selects `Bulk Assign Fine` and either selects members or uploads CSV with member IDs/emails.
2. Choose `FineRule`, optional common note, and preview.
3. System validates each row against preconditions (member exists, active, season valid).
4. Display preview with counts: 100 rows, 90 valid, 10 invalid (show reasons).
5. Admin confirms. System enqueues a batch job or processes in client in paged writes:
   - For each valid row, create Fine + Payment + ActivityLog; write outcome per-row to `bulkOperations/{id}` subcollection `results`.
6. Show results; allow CSV export of failures for retry.

Bulk import members
1. Admin uploads CSV with columns (email, name, role, joinedAt, externalId).
2. Validate for duplicates and required fields.
3. Preview and confirm; process in batches.

Undo/rollback
- Provide a soft-undo window (e.g., 10 minutes) where bulk-created fines/payments are flagged and can be reverted from `bulkOperations` UI. Reversion writes `activityLog` entries and soft-deletes created documents.

## Data model
- `bulkOperations` collection to track jobs and per-row results:

```
bulkOperation: {
  id: string,
  teamId: string,
  type: 'assignFine'|'adjust'|'importMembers',
  createdBy: string,
  createdAt: timestamp,
  status: 'pending'|'processing'|'completed'|'failed',
  stats: { total, succeeded, failed },
}

bulkOperationResult: {
  rowIndex: number,
  status: 'success'|'failed',
  message?: string,
  createdIds?: { fineId?: string, paymentId?: string }
}
```

## Security
- Only admins may start bulk operations. Bulk writes must preserve authorization checks for each item (validate member membership in same team before creating fines).

## Acceptance Criteria
- Admin can upload CSV and preview results before committing.
- System processes the bulk operation and records results per row.
- Failures are exported as CSV for retry.
- Undo within configured window works reliably and produces `activityLog` entries.

## Tests
- Unit: validation functions for CSV rows.
- Integration: batch processing against emulator verifying created fines and results recording.
- E2E: import flow with small CSV, confirm processing and success screenshots.

## Implementation notes
- Avoid single large Firestore transactions; use batched writes per page (e.g., 200 writes per batch) and idempotent operations (use deterministic IDs if helpful).
- Use background worker (Cloud Function) for heavy imports, or process using client with job tracking if Cloud Functions not available.
