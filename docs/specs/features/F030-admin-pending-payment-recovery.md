# F030 - Admin Pending Payment Recovery

## Problem
When a member pays via MobilePay but does not complete the in-app return flow, the payment status can remain pending for too long. Admins need a fast, low-risk way to resolve these cases without database access.

## Goal
Allow admins to manually recover and finalize stale pending payments from the existing admin payment workflow.

## Actors
- Admin
- Member

## Preconditions
- Team has at least one payment with status pending.
- Admin is authenticated and has payment approval permissions.
- Payment belongs to an active or historical season with valid balance tracking records.

## Flow
1. Admin opens Indstillinger and navigates to Betalinger.
2. System displays all pending payments with initiated timestamp and elapsed pending time.
3. System marks a pending payment as stale only when initiatedAt is older than 24 hours.
4. Admin verifies a stale pending payment against MobilePay Box history.
5. Admin chooses Godkend when payment is confirmed received.
6. System updates payment status from pending to approved, sets approvedAt and approvedBy, updates balances atomically, and writes payment.approved ActivityLog entry.
7. Admin chooses Afvis when payment cannot be confirmed.
8. System treats Afvis as dismiss and updates payment status from pending to disputed, updates balances atomically, and writes payment.disputed ActivityLog entry.
9. System removes the resolved payment from pending queues and updates all affected overview totals.
10. Member sees updated status on personal overview after next data refresh.

## Edge Cases
- No pending payments exist: system shows empty state in Betalinger.
- Admin without payment permission opens page: system blocks actions and shows access denied state.
- Two admins action the same pending payment nearly simultaneously: only one status transition succeeds; second action fails with clear feedback.
- Network failure during approve/dismiss: no partial state change is committed; payment remains pending and action can be retried.
- Legacy payment uses fineId instead of fineIds: stale handling still works and updates status correctly.
- Payment already moved out of pending before action: system rejects transition and reloads the queue.

## Acceptance Criteria
- Show pending payments with member, amount, initiatedAt, and elapsed pending time.
- Mark payments as stale only when initiatedAt is older than 24 hours.
- Allow admins to approve stale pending payments from the same admin payment interface.
- Allow admins to dismiss stale pending payments from the same admin payment interface.
- Transition dismissed payments to existing status disputed (no new payment status).
- Enforce state transition rules so only pending payments can be approved or dismissed.
- Write exactly one ActivityLog entry for each successful admin action.
- Update per-season balances atomically with each successful status change.
- Return clear error feedback when a stale payment action fails.
- Prevent non-admin users from executing payment recovery actions.
- Reflect resolved status in member and admin views after reload/refresh.
