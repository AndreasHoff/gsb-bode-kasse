---
status: open
supersedes: F003
---

# F023 - Pay Fine (MobilePay Box)

## Problem
Members have no structured in-app payment path for outstanding fines. Without it, payments happen ad-hoc, admins have no approval queue, and the club loses track of who has paid. The previous approach (F003) used a MobilePay deep-link, which is incompatible with MobilePay Box — the product the club actually uses.

## Goal
Allow a member to initiate payment of one or more outstanding fines via the club's MobilePay Box, then have an admin approve or dispute the payment through a structured workflow.

## Actors
- Member (initiates payment)
- Admin (approves or disputes payment)

## Preconditions
- Member is authenticated and belongs to the team.
- Member has at least one fine with status `unpaid`.
- Team has a configured `mobilePayBoxUrl`.

## Flow

### Member initiates payment

1. Member opens Mine Bøder (personal debt overview).
2. System shows a list of unpaid fines; each fine has a "Betal bøde" button. If more than one fine is unpaid, a "Betal alle" button is also shown.
3. Member taps "Betal bøde" on a single fine, or taps "Betal alle".
4. System shows a payment confirmation dialog:
   ```
   Du er ved at betale:

   <Bødetitel(er)>
   I alt: 25 DKK

   til klubbens MobilePay Box.
   Indtast beløbet manuelt i MobilePay.

   [ Åbn MobilePay ]   [ Annuller ]
   ```
5. Member taps "Åbn MobilePay".
6. System opens the team's `mobilePayBoxUrl` in a new browser tab without navigating away from the app.
7. Member enters the correct amount in MobilePay and completes the payment.
8. Member returns to the app.
9. System shows a confirmation dialog:
   ```
   Har du gennemført betalingen?

   [ Ja ]   [ Nej ]
   ```
10. Member taps "Ja".
11. System creates a single `Payment` record:
    - `fineIds`: array of all selected fine IDs
    - `userId`: member's ID
    - `amount`: sum of all selected fines
    - `status`: `pending`
    - `initiatedAt`: now
12. System writes a `payment.initiated` ActivityLog entry atomically with the Payment record.
13. Member sees the selected fines labelled "Afventer godkendelse"; their "Betal" buttons are disabled.

### Member cancels

10b. Member taps "Nej" or dismisses the dialog.
11b. No Payment record is created. Fines remain `unpaid` and payable.

### Admin approves payment

1. Admin navigates to the pending payments page.
2. System shows all payments with `status: pending`, each displaying member name, fine title(s), total amount, and `initiatedAt`.
3. Admin verifies the incoming payment in the MobilePay Box.
4. Admin taps "Godkend".
5. System sets `Payment.status` to `approved`, sets `approvedAt` and `approvedBy` atomically.
6. System writes a `payment.approved` ActivityLog entry.
7. Payment disappears from the pending queue.
8. Linked fine(s) appear as paid in the member's overview.

### Admin disputes payment

4b. Admin taps "Afvis" on a pending payment (e.g. wrong amount, no matching payment found in MobilePay Box).
5b. System sets `Payment.status` to `disputed` atomically.
6b. System writes a `payment.disputed` ActivityLog entry.
7b. Payment disappears from the pending queue and appears in a disputed list visible to both admin and the member.
8b. Linked fine(s) revert to `unpaid` in the member's overview and become payable again.

## Edge Cases
- Member opens MobilePay but does not complete payment → member taps "Nej"; no Payment record is created.
- Member taps "Ja" without actually paying → Payment enters `pending`; admin sees no matching payment in MobilePay Box and disputes it; fine reverts to `unpaid`.
- Fine already has a linked `pending` Payment → "Betal" button is disabled and status reads "Afventer godkendelse"; member cannot initiate a duplicate payment.
- "Betal alle" with zero unpaid fines → button is not rendered.
- Team has no `mobilePayBoxUrl` configured → all "Betal" buttons are disabled with the message "MobilePay er ikke konfigureret for dette hold".
- Network failure during Payment record creation → error message shown; no Payment record created; fines remain `unpaid`.
- Admin attempts to action a payment not in `pending` state → operation blocked; payment is not shown in the pending queue.
- Combined payment spans multiple fines; admin wishes to partially dispute → partial dispute is not supported in v1; admin must dispute the full payment.

## Acceptance Criteria
- "Betal bøde" button is shown on each unpaid fine in Mine Bøder.
- "Betal alle" button is shown only when the member has more than one unpaid fine.
- Tapping "Åbn MobilePay" opens the team's `mobilePayBoxUrl` in a new tab and does not navigate away from the app.
- Tapping "Nej" creates no Payment record; fines remain `unpaid`.
- Tapping "Ja" creates a single `Payment` record with `fineIds` (array), correct total `amount`, `userId`, `status: pending`, and `initiatedAt` set.
- `payment.initiated` ActivityLog entry is written in the same atomic operation as the Payment record.
- Fines linked to a `pending` Payment display "Afventer godkendelse"; their "Betal" button is disabled.
- Admin pending payments page lists all payments with `status: pending`, showing member name, fine title(s), total amount, and initiation time.
- Approving a payment atomically sets `status: approved`, `approvedAt`, and `approvedBy`; writes `payment.approved` ActivityLog entry.
- Disputing a payment atomically sets `status: disputed`; writes `payment.disputed` ActivityLog entry.
- After a dispute, linked fine(s) revert to unpaid and the "Betal" button is re-enabled in the member's overview.
- All action buttons are disabled while a request is in flight.
- "Betal" buttons are disabled with explanatory text when no `mobilePayBoxUrl` is configured for the team.

## Domain Model Changes
- `Payment.fineId: string` is replaced by `Payment.fineIds: string[]` to support combined payments. Single-fine payments use a one-element array.
- `Team` gains `mobilePayBoxUrl?: string` to store the club's MobilePay Box URL. The URL for this club is: `https://qr.mobilepay.dk/box/2d320bea-781b-4442-9fc2-879e9ec36e8a/pay-in`.

## Future Enhancements
- V2: Investigate whether MobilePay Box supports a prefilled amount via URL parameters to reduce member input errors.
- V3: Replace the manual approval workflow with a full Vipps MobilePay API integration (server-side payment sessions, redirect URLs, webhooks, automatic reconciliation).
