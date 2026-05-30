# F015 - Payment Reconciliation & Refunds

## Problem
Payments may need reconciliation or refunds after disputes or errors.

## Goal
Allow admins to mark payments as reconciled or issue refunds (manual), with audit trail.

## Acceptance Criteria
- Reconciliation workflow available to admins
- Refunds create `payment.refunded` activity entries
- Financial records updated appropriately

<!-- TODO: Not implemented in code — implement refund/reconcile helpers in `src/lib/firestore/payments.ts` and add admin UI. -->
