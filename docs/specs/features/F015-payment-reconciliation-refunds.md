# F015 - Payment Reconciliation & Refunds

## Summary
Provide tools for admins to reconcile external payment provider transactions against app `payments`, and to issue refunds (manual or integrated) against approved payments. This feature supports accurate accounting and a clear audit trail.

## Problem
External payment providers (MobilePay, banks) produce transaction feeds that must be matched to internal `payments`. Mismatches, partial payments, and refund requests currently require manual bookkeeping and disappear into ad-hoc processes.

## Goal
- Allow admins to import or ingest external transactions and match them to internal `payments`.
- Provide a workflow for issuing refunds and tracking refund status.
- Support bulk matching heuristics (amount + timestamp window + externalTxId).
- Create a permanent reconciliation record with pointers to both transaction and payment.

## Actors
- Admin (finance role)
- Payer (member)
- System / Cloud Functions (for provider webhooks)

## Preconditions & assumptions
- External transactions contain at least: `externalTxId`, `amount`, `timestamp`, and optionally payer metadata.
- Integrations (webhooks) and manual CSV imports are supported.
- Refund provider integration (MobilePay) requires server-side credentials and a Cloud Function.

## Domain model additions
- `reconciliations` collection document shape:

```
reconciliation: {
  id: string,
  teamId: string,
  paymentId?: string,        // linked internal payment if matched
  externalTxId?: string,     // provider transaction id
  amount: number,
  timestamp: timestamp,
  method: 'mobilepay'|'bank'|'manual',
  matchedBy?: string,        // uid who matched
  matchedAt?: timestamp,
  notes?: string,
  status: 'unmatched'|'matched'|'failed'
}
```

- `refunds` collection document shape:

```
refund: {
  id: string,
  teamId: string,
  paymentId: string,
  amount: number,
  reason?: string,
  status: 'requested'|'processing'|'completed'|'failed',
  requestedBy: string,
  requestedAt: timestamp,
  processedBy?: string,
  processedAt?: timestamp,
  providerRefundId?: string
}
```

## UI / Screens
- Reconciliation Dashboard
  - Left: list/import of external transactions (with filters)
  - Right: list of unmatched internal `payments`
  - Matching controls: auto-suggest matches, manual match action
- Refunds screen (payment detail view)
  - `Request refund` button for an approved payment (opens modal for amount & reason)
  - Refund request list with statuses

## Flows

Auto-match flow (webhook or import)
1. System receives external transaction (webhook or CSV import).
2. Attempt automatic match:
   - Exact `externalTxId` lookup in `payments`.
   - If no exact match, search for payments with same `amount` within a configurable time window (e.g., +/-24 hours).
3. If a single likely match found, mark reconciliation as `matched` and optionally auto-approve related payment (configurable per team).
4. If ambiguous or no match, create `reconciliation` with `status='unmatched'` and show in Reconciliation Dashboard for a human to resolve.

Manual match flow
1. Admin opens Reconciliation Dashboard.
2. Selects unmatched external transaction and selects internal payment to link.
3. System records `reconciliation.paymentId = chosenPaymentId`, `status = 'matched'`, `matchedBy` and `matchedAt`.
4. Optionally update `payments/{id}.status` to `approved` (if business rules require).

Refund flow (admin-initiated)
1. Admin opens payment detail for an approved payment.
2. Click `Request refund`, fill amount and reason (partial refunds allowed).
3. System creates `refunds` document with `status = 'requested'`.
4. If provider-integrated: backend sends refund request to provider and updates `refunds` to `processing` then `completed` or `failed` based on provider response.
5. If manual: admin marks `refunds` as `completed` after offline processing.
6. Create `activityLog` entries for `refund.requested` and `refund.completed` and adjust member balances accordingly.

## Security rules
- Only users with finance/admin role may create `reconciliations` and `refunds` or mark them as `matched`/`completed`.

## Acceptance Criteria
- System can ingest webhook or CSV and create `reconciliation` records.
- Admin can manually match unmatched transactions to payments.
- Refund request lifecycle is persisted and shows correct statuses.
- Refund processing updates `payments` and `activityLog` consistently.
- Automated tests: unit tests for reconciliation heuristics, integration test for import flow, Playwright E2E for manual matching and refund request UI.

## Testing & automation
- Unit: matching heuristics with synthetic datasets.
- Integration: emulator-driven test where a webhook creates a reconciliation then admin matches it.
- E2E Playwright: Admin logs in, imports a CSV, matches a transaction, requests a refund, takes screenshots.

## Implementation notes
- Prefer storing provider webhooks into `reconciliations` via a Cloud Function and running matching logic server-side. This avoids exposing provider secrets to the frontend.
- Keep refund provider interactions in Cloud Functions; frontend only creates `refunds` and displays status.

## Edge cases
- Partial refunds must split original `payment` accounting.
- Multiple externalTxIds mapping to the same payment — mark as potential duplicates and flag for manual review.
- Chargebacks and failed refunds must be tracked and displayed in member history.
