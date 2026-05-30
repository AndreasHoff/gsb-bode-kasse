# F014 - Admin Payment Approval

## Summary
Admins must be able to review, approve, or dispute incoming payment receipts (for example MobilePay confirmations or manual receipts) before the payment is applied to member balances. This feature provides a secure, auditable admin UI and backend flows for approving or disputing pending payments.

## Problem
Payments originating outside the app (MobilePay, manual bank transfers) or submitted by members may arrive as pending receipts. If applied automatically, mistakes, duplicates, or fraud can change member balances incorrectly. There must be an explicit admin verification step for teams that require oversight.

## Goal
- Provide a single-screen admin workflow that lists all `pending` payments for the current team.
- Allow admins to approve or dispute each pending payment with an optional note.
- Ensure all changes are transactional and audited in `ActivityLog`.
- Prevent race conditions (double-approval / duplicate externalTxId).
- Expose clear acceptance criteria and automated tests including Playwright end-to-end.

## Actors
- Admin (must satisfy `canApprovePayments(role)`)
- Member (payer): may be notified about approval/dispute
- System (backend): applies status transitions and writes logs

## Preconditions
- Team exists and the admin is a member of the team.
- Payments created by integration or user flow with `status: "pending"` and `teamId` set.
- Firestore collections used: `payments`, `fines`, `activityLog`, `members`.

## Domain / Data Model (payment)
Example payment document shape (required fields):

```
payment: {
  id: string,
  teamId: string,
  amount: number,            // integer DKK (or minor unit if preferred)
  currency: 'DKK',
  status: 'pending'|'approved'|'disputed'|'failed',
  method: 'mobilepay'|'manual'|'bank'|'other',
  payerId: string,           // uid of the paying member (optional when unknown)
  externalTxId?: string,     // external provider transaction id if available
  createdAt: timestamp,
  createdBy?: string,
  approvedBy?: string,
  approvedAt?: timestamp,
  disputedBy?: string,
  disputedAt?: timestamp,
  note?: string,
  meta?: { [k: string]: any }
}
```

## Firestore queries / indexes
- Query pending payments for a team: `payments` where `teamId == X` and `status == 'pending'` ordered by `createdAt desc`.
- Paginate with `limit` and `startAfter` for long lists.

Indexes recommended:
- Composite index: `teamId ASC, status ASC, createdAt DESC` (for admin listing)

## Security rules (high level)
- Read: Admins may read `payments` for their team.
- Write (approve/dispute): Only users who `canApprovePayments(role)` may set `status` to `approved` or `disputed`.
- Writes must be transactional and preserve audit fields: `approvedBy`, `approvedAt`, `disputedBy`, `disputedAt`.
- Prevent arbitrary `approvedAt` or `approvedBy` injection by validating `request.auth.uid` and server timestamps where possible.

Example rule intent (pseudocode):

```
allow update: if isAdminForTeam(request.auth.uid, resource.data.teamId)
  && ((request.resource.data.status == 'approved' && request.resource.data.approvedBy == request.auth.uid)
    || (request.resource.data.status == 'disputed' && request.resource.data.disputedBy == request.auth.uid));
```

Note: Firestore rules must remain simple — perform final authorization checks server-side (Cloud Function) if complex verification (e.g. checking externalTx provider) is required.

## UI / Screens
- Admin Payments Review screen (new) — accessible from Settings → Payments (admin only).
- Rows show: payer display name (or external payer text), amount, method (MobilePay / Manual), externalTxId (if present), createdAt, excerpt of note, actions: Approve, Dispute, Details.
- Row states: Pending (default), Approving (optimistic UI), Error (toast/inline), Approved (success visual), Disputed (warning visual).
- Batch actions: Approve selected, Dispute selected (optional v1; single-action first).

Design notes:
- Mobile-first (430px width). Keep list compact; use expandable details panel for each payment.

## Flows

Happy path — Admin approves a payment
1. Admin opens Admin Payments Review.
2. App queries `payments` where `teamId == currentTeam && status == 'pending'` (paginated).
3. Admin clicks `Approve` on a row.
4. UI opens confirmation modal (optional for large amounts), Admin confirms.
5. Client runs a Firestore transaction/batch:
   - Read the payment doc to ensure `status == 'pending'` and `externalTxId` is not already matched to an `approved` payment.
   - Set `status = 'approved'`, `approvedBy = currentUid`, `approvedAt = serverTimestamp()`.
   - Optionally increment a member's cached balance / write to member's aggregated counters.
   - Create `activityLog` entry `{ type: 'payment.approved', by: uid, paymentId, teamId, amount, ts }`.
6. Transaction commits; UI shows success; payer notification is emitted (optional push/email).

Happy path — Admin disputes a payment
1. Admin selects `Dispute` and provides a reason.
2. Client creates a batch transaction:
   - Read payment doc, validate `status == 'pending'`.
   - Set `status = 'disputed'`, `disputedBy = currentUid`, `disputedAt = serverTimestamp()`, `note = reason`.
   - Create `activityLog` entry `{ type: 'payment.disputed', ... }`.
3. Notify payer and optionally escalate to `finance` role or super-admin via notification or email.

Concurrency & edge conditions
- If transaction fails because `status` changed (another admin approved), show a message: `Payment already processed by <name> at <time>` and refresh the row.
- If `externalTxId` duplicates another already-approved payment, warn and require manual reconciliation before approving.

## Back-end / Cloud Functions
- Where available, prefer server-side verification for provider webhooks (MobilePay) and mark payments as `pending` with `externalTxId`. Use a Cloud Function to automatically reconcile webhooks to pending payments (optional). The admin UI is the manual fallback and audit surface.

## Acceptance Criteria
- Admin can open `/settings/payments` and see pending payments for their team.
- Approving a payment changes `payments/{id}.status` to `approved`, sets `approvedBy` and `approvedAt`, and creates an `activityLog` entry.
- Disputing a payment changes `status` to `disputed`, sets `disputedBy` and `disputedAt`, stores the dispute reason, and creates an `activityLog` entry.
- Non-admin users cannot access the Admin Payments Review screen or call the approve/dispute update paths.
- Concurrency is handled: if payment is already processed, UI reports the actual final state.
- Automated tests: unit tests for `getPendingPayments()` and `approvePayment()`; component tests for `AdminApproval` rendering and actions; Playwright end-to-end test that performs approve/dispute flows using an admin test account.

## Tests (suggested)
- Unit: `getPendingPayments(teamId)` returns only `pending` payments.
- Unit/Integration: `approvePayment(teamId, paymentId, adminId)` performs the correct transactional updates and writes `activityLog`.
- Component: `AdminApproval` renders list, modal confirms approval, shows success state.
- Playwright E2E: using admin test account run full flow and capture screenshots:
  - Capture the Admin Payments Review screen at 430px width.
  - Capture a payment row before and after approval.
  - Capture the Activity Log entry.

## Implementation notes for devs
- Use existing permission helpers in `src/lib/permissions.ts` to gate UI and server actions.
- Add `getPendingPayments(teamId)` helper in `src/lib/firestore/payments.ts` (already present in recent work) and reuse it.
- Use Firestore transactions for approve/dispute to guarantee atomicity and to prevent duplicates.
- Write well-formed `activityLog` entries with types `payment.approved` and `payment.disputed`.
- Tests should mock Firestore where possible and run fast; add integration tests that run against emulator for E2E where possible.

## Playwright / Visual test requirements
- Mobile-first screenshot: viewport width = 430px to show compact list.
- Evidence required per release policy: screenshots of the Admin Payment Review screen showing a pending payment and the same payment after approval (two screenshots).

## Edge cases / open questions
- If payments are auto-reconciled by a webhook, should admin approval still be required? (Configurable per team.)
- Refund workflows live in F015 — how will approved payments be linked to refunds for accounting?
- Retain `pending` payments for a configurable retention period (e.g., 90 days) before automatic archival.

## Rollout strategy
- Feature default: disabled. Add a team-level toggle `requireAdminPaymentApproval` (false by default) so teams can opt-in.
- Migration: no data migration required for existing `payments`; default behavior unchanged until toggle enabled.
