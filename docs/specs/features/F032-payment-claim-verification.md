# F032 – Payment Claim Verification

## Problem

The current automatic payment detection system relies on listening for events fired by members after they complete a MobilePay transfer. This approach is fragile and creates edge cases where members complete payment but never return to the app, leaving admins uncertain whether the member actually paid or not. Admins cannot reliably process payments without manual MobilePay balance verification, and the lack of explicit confirmation creates friction in the payment approval workflow.

## Goal

Members explicitly confirm they have transferred payment in MobilePay by clicking a "Jeg har betalt" button in the app; admins then review the claim in a dedicated "Betalinger" tab and approve or deny based on verification of the actual MobilePay balance. Members receive in-app notifications of approval or denial and can resubmit if denied.

## Actors

- Member
- Admin

## Preconditions

- Member has outstanding fines in the active season
- Member has clicked "betal alle udestående bøder" button and been redirected to MobilePay
- A Payment record exists with status `pending` for the member's outstanding fines

## State Transitions

Payment status follows this path through this feature:

```
unpaid
  ↓
pending (created when member clicks "betal alle udestående bøder")
  ↓
claimed (member clicks "Jeg har betalt" in the app)
  ├→ approved (admin clicks "Godkend")
  └→ unpaid (admin clicks "Afvis"; member can retry)
```

Only claimed payments appear in the admin "Betalinger" tab. No payment should skip `pending` state — that is the invariant that ensures tracking of payment initiation time.

## Flow

### Member Flow

1. Member is in the Fines tab and sees "betal alle udestående bøder" button
2. Member clicks button and is redirected to MobilePay
3. Member completes (or does not complete) payment in MobilePay and returns to the app
4. App displays a new button: "Jeg har betalt" (overlaid or prominent in the fine view)
5. Member clicks "Jeg har betalt"
6. System creates/updates Payment record, sets status to `claimed`, and fires notification to all admins
7. Member sees confirmation: "Din betaling venter på godkendelse. Du får besked når den er behandlet." (toast or persistent banner)
8. Member's outstanding fines now show status badge: "Afventer godkendelse"
9. (Later) Member receives in-app notification: "Din betaling er godkendt ✓" or "Din betaling blev afvist. Prøv igen →"

### Admin Flow

1. Admin navigates to Admin Settings
2. Admin opens "Betalinger" tab
3. Tab displays a list of Payment claims with status `claimed`, sorted by most recent first
4. Each claim shows:
   - Member name
   - Claimed amount (sum of fines)
   - Date/time of claim
   - Quick action buttons: "Godkend" (approve) or "Afvis" (deny)
5. Admin taps "Godkend":
   - Payment status changes to `approved`
   - Member is notified in-app: "Din betaling er godkendt ✓"
   - Entry is removed from "Betalinger" tab (or moved to archive/historical view)
   - Member's fines are now marked as paid
   - ActivityLog entry created: `payment.approved` with admin as actor
6. Admin taps "Afvis":
   - Payment status reverts to `unpaid`
   - Member is notified in-app with button to retry: "Din betaling blev afvist. Prøv igen →"
   - Entry is removed from "Betalinger" tab
   - Member can click "betal alle udestående bøder" again and repeat the flow
   - ActivityLog entry created: `payment.denied` with admin as actor and reason

## Edge Cases

- **Member claims payment but never actually paid:** Admin verifies MobilePay balance, denies the claim. Member is notified and can retry.
- **Member pays partial amount:** Admin sees the partial amount paid in MobilePay, denies the claim. Member is notified to complete the full payment.
- **Member clicks "Jeg har betalt" multiple times:** Second click is idempotent; no duplicate payment claim is created.
- **Member claims payment, then new fines are assigned before admin approves:** The claimed payment amount does not change; only the fines that existed at claim time are covered. New fines remain outstanding.
- **Admin denies claim but member does not return to app:** The denied claim is no longer visible in the admin "Betalinger" tab. Member sees the denial notification on next login with a retry button.
- **Member pays via direct bank transfer instead of MobilePay:** Admin denies claim if amount does not match MobilePay balance. This is a member support issue, not a system issue.

## Notification Data Model

Members will receive in-app notifications when a payment claim is approved or denied. The notification system shall:

- Store notifications as documents in a sub-collection `teams/{teamId}/users/{userId}/notifications`
- Each notification record includes: `type` ("payment.approved" or "payment.denied"), `paymentId`, `message` (localized text), `createdAt`, and `read` (boolean)
- Member sees notifications via a dedicated in-app notification center accessible from their profile or settings
- Notifications persist until explicitly dismissed by the member
- On next login, any unread notifications are displayed as banners or alerts before returning to the member's previous screen

**This is a cross-cutting system** — if a separate notification feature (F0YY) is implemented later, this spec should integrate with it.

## Acceptance Criteria

### Member UI & Notifications

- [ ] When a member has outstanding fines and a Payment with status `pending` exists, a new button "Jeg har betalt" is prominently displayed in the Fines tab (below the existing payment button or as an alternate state)
- [ ] Clicking "Jeg har betalt" updates the Payment status to `claimed` and displays a confirmation toast: "Din betaling venter på godkendelse. Du får besked når den er behandlet."
- [ ] Member's fines immediately show a "Afventer godkendelse" badge/tag after clicking "Jeg har betalt"
- [ ] When a member logs in and an admin has approved their payment, they see an in-app notification banner: "Din betaling er godkendt ✓" with a close button
- [ ] When a member logs in and an admin has denied their payment, they see an in-app notification banner: "Din betaling blev afvist. Prøv igen →" with a button to navigate back to Fines
- [ ] Notifications persist in an in-app notification center (accessible from member profile) showing all payment approval/denial events
- [ ] Clicking "Jeg har betalt" multiple times on the same payment does not create duplicate Payment records or duplicate notifications

### Admin UI & Workflow

- [ ] A "Betalinger" tab exists in Admin Settings (already in UI, now receives new data)
- [ ] "Betalinger" tab displays a list of Payment claims with status `claimed`, sorted by most recent first
- [ ] Each payment claim row displays: member name, claimed amount (formatted with DKK), date/time of claim, two action buttons ("Godkend" and "Afvis")
- [ ] Clicking "Godkend" on a claimed payment:
  - [ ] Changes Payment status to `approved`
  - [ ] Creates ActivityLog entry with action `payment.approved`
  - [ ] Removes the entry from the "Betalinger" tab
  - [ ] Triggers an in-app notification to the member: "Din betaling er godkendt ✓"
- [ ] Clicking "Afvis" on a claimed payment:
  - [ ] Changes Payment status to `unpaid`
  - [ ] Creates ActivityLog entry with action `payment.denied`
  - [ ] Removes the entry from the "Betalinger" tab
  - [ ] Triggers an in-app notification to the member: "Din betaling blev afvist. Prøv igen →"
- [ ] If the "Betalinger" tab is empty (no claimed payments), display a message: "Ingen betalinger afventer godkendelse"
- [ ] ActivityLog gains a new action type: `payment.claimed` (member clicks "Jeg har betalt") and `payment.denied` (admin denies claim) — both recorded atomically with the status change

### Data & Integration

- [ ] Payment entity gains a new status value: `claimed` (in addition to existing `unpaid`, `pending`, `approved`, `disputed`)
- [ ] ActivityLog gains a new action type: `payment.denied` (in addition to existing `payment.approved`, etc.)
- [ ] Each claimed payment record captures:
  - [ ] The exact fineIds claimed
  - [ ] The amount claimed (sum of fine amounts at time of claim)
  - [ ] The timestamp when "Jeg har betalt" was clicked
  - [ ] The approving/denying admin userId and timestamp (when applicable)
- [ ] Member's UserSeasonBalance is updated atomically when payment is approved (fines move from `outstandingBalance` to `approvedBalance`)

### Permissions & Safety

- [ ] Only Admins of the team can access the "Betalinger" tab in Admin Settings
- [ ] Only Admins can approve or deny payment claims
- [ ] Members can only see their own payment notifications
- [ ] Members cannot manually set Payment status; only Members can claim, only Admins can approve/deny

## Known Limitations (v1)

- **Multiple admins simultaneous viewing:** If Admin A approves a claim while Admin B has the "Betalinger" tab open, Admin B's view becomes stale. Admin B must manually refresh to see the updated list. Real-time collaborative updates are out of scope for v1.
- **Notification delivery latency:** Notifications are created atomically with the payment status change but are not pushed in real-time. Members will see notifications on next app open or refresh.
