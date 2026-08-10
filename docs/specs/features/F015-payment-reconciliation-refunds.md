# F015 - Payment Reconciliation & Refunds

## Problem
Two gaps exist in the payment lifecycle: admins cannot reverse an approved payment when a mistake is made (refund), and there is no way to record cash payments that happen outside MobilePay (manual reconciliation).

## Goal
Allow admins to refund approved payments and manually reconcile unpaid or disputed payments, with a full audit trail.

## Actors
- Admin (and Super-admin)

## Preconditions
- User is authenticated with admin role in the team.

## Flow

**Refunding an approved payment:**
1. Admin navigates to Indstillinger → Refunder.
2. System shows a list of recently approved payments with member name, fine title, and amount.
3. Admin clicks "Refunder" on a payment.
4. System shows an inline confirmation: "Er du sikker? Betalingen markeres som ubetalt igen."
5. Admin confirms.
6. System resets payment status to `unpaid`, clears `approvedAt` and `approvedBy`, and writes a `payment.refunded` ActivityLog entry atomically.
7. Payment disappears from the approved list.

**Manually reconciling a payment (cash):**
1. Admin navigates to Indstillinger → Refunder.
2. System shows a list of unpaid and disputed payments with member name, fine title, and amount.
3. Admin clicks "Marker som betalt" on a payment.
4. System sets payment status to `approved`, sets `approvedAt` and `approvedBy`, and writes a `payment.reconciled` ActivityLog entry atomically.
5. Payment disappears from the reconciliation list.

## Edge Cases
- Attempting to refund a payment that is not approved → operation blocked (not shown in list).
- Attempting to reconcile an already-approved payment → not shown in reconcile list.
- Network failure → error message shown, state unchanged.
- No approved payments → empty state shown for refunds section.
- No unpaid/disputed payments → empty state shown for reconciliation section.

## Acceptance Criteria
- Admin can refund an approved payment after inline confirmation.
- Refunded payment has status `unpaid`, `approvedAt` cleared, and `approvedBy` cleared in Firestore.
- `payment.refunded` ActivityLog entry is written atomically with the status change.
- Admin can manually mark an unpaid or disputed payment as approved.
- Reconciled payment has status `approved`, `approvedAt`, and `approvedBy` set in Firestore.
- `payment.reconciled` ActivityLog entry is written atomically.
- Action buttons are disabled while a request is in flight.
- Each section shows an appropriate empty state when there are no items.

