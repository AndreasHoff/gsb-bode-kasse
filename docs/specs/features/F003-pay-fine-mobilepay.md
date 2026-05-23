# F003 - Pay Fine (MobilePay Flow)

## Problem
Members need a frictionless way to pay outstanding fines. The app must not act as a payment processor but should route users to MobilePay with prefilled details.

## Goal
Allow a member to initiate payment for one or more outstanding fines via MobilePay deep-link, then have an admin confirm receipt.

## Actors
- Member (initiates)
- Admin (approves)

## Preconditions
- Member has at least one unpaid fine
- Team has a configured MobilePay recipient number

## Flow

### Member Side
1. Member opens personal debt overview
2. Views list of unpaid fines
3. Taps "Pay" on one or more fines (or "Pay All")
4. App constructs MobilePay deep-link with:
   - Total amount
   - Recipient number (team MobilePay recipient)
   - Comment string (e.g. "Bøde: Kom for sent – Andreas")
5. App opens MobilePay (native or browser fallback)
6. Payment records updated to status `pending`
7. Member returns to app after completing payment
8. App shows "Payment pending approval" state

### Admin Side
9. Admin sees payments in `pending` state in overview
10. Admin taps "Approve" on payment
11. System sets Payment status to `approved`
12. ActivityLog entry created (`payment.approved`)
13. Member's debt overview reflects cleared fine

## MobilePay Deep-Link Format
```
mobilepay://send?amount={amount}&recipient={phone}&comment={comment}
```
Fallback: `https://mobilepay.dk/...`

## Edge Cases
- MobilePay not installed → open browser fallback link
- Member pays wrong amount → admin can dispute (`payment.disputed`)
- Admin accidentally approves → no auto-reversal; log entry required
- Multiple pending payments → admin can bulk approve
- Member taps "Pay" but closes MobilePay without paying → status stays `pending` until admin action

## Acceptance Criteria
- MobilePay app opens with correct prefilled amount and recipient
- Payment status changes to `pending` immediately on tap
- Admin approval screen shows member name, amount, and fine title
- Approved payments disappear from the unpaid list
- ActivityLog records both `payment.initiated` and `payment.approved`
- Disputed payments are visible to both member and admin
