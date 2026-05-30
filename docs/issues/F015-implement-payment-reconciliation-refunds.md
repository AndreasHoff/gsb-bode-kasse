# Issue: F015 - Implement Payment Reconciliation & Refunds

Summary
---
Payments currently support initiate/approve/dispute flows but lack manual refund and reconciliation functionality.

Missing work
---
- Add `refundPayment(teamId, paymentId, actorId, reason)` helper in `src/lib/firestore/payments.ts` that:
  - transitions status to `refunded`
  - writes `payment.refunded` ActivityLog with metadata `{ fineId, amount, userId, refundReason }`
  - sets reconciliation flags if needed
- Add admin UI to list payments requiring reconciliation and allow issuing manual refunds
- Add unit/integration tests covering refund flow and ActivityLog entries

Acceptance criteria
---
- Admins can issue manual refunds that set payment status to `refunded`
- Refunds produce `payment.refunded` ActivityLog entries with expected metadata
- Tests cover the refund flow

References
---
- `src/lib/firestore/payments.ts`
- `docs/specs/features/F015-payment-reconciliation-refunds.md`
