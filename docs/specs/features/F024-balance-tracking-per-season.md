# F024 - Balance Tracking Per Season

## Problem

Members and admins cannot see accurate financial summaries because user balances and team totals are not automatically maintained. The existing `outstandingFineBalance` and `totalPaidAmount` fields on User exist but are never updated when fines are assigned or payments change status. Additionally, there is no way to distinguish between actual money received (approved payments) and money awaiting admin confirmation (pending payments) at the team level.

## Goal

Automatically track and maintain accurate per-season balances for both individual members and the team, distinguishing between unpaid fines, pending payments awaiting approval, and approved payments that represent actual money in the bødekasse account.

## Actors

- Member (views their own balances)
- Admin (views member balances and team totals)

## Preconditions

- User is authenticated and has an active membership in the team
- An active season exists for the team
- Fines and payments have been created via existing flows (F001, F002, F003, F014, F023)

## Flow

**Balance initialization (when season is created):**
1. Admin creates a new season (via F021)
2. System initializes Season balance fields to zero:
   - `totalApprovedBalance = 0`
   - `totalPendingBalance = 0`
   - `totalOutstanding = 0`

**Balance update (when fine is assigned):**
1. Admin assigns a fine to one or more members (via F001 or F002)
2. System creates the fine and unpaid payment records
3. For each assigned user, system:
   - Fetches or creates UserSeasonBalance for (userId, teamId, seasonId)
   - Increments `outstandingBalance` by fine amount
   - Sets `updatedAt` to current timestamp
   - Writes balance update atomically with fine creation
4. System increments Season `totalOutstanding` by total fine amount
5. System writes `balance.updated` ActivityLog entry with metadata:
   - `userId`, `teamId`, `seasonId`
   - `delta: { outstandingBalance: +amount }`
   - `trigger: "fine.assigned"`

**Balance update (when payment is initiated):**
1. Member initiates payment (unpaid → pending) via F003 or F023
2. System updates payment status to "pending"
3. System fetches UserSeasonBalance for (userId, teamId, seasonId)
4. System atomically:
   - Decrements `outstandingBalance` by payment amount
   - Increments `pendingBalance` by payment amount
   - Sets `updatedAt` to current timestamp
5. System updates Season:
   - Decrements `totalOutstanding` by payment amount
   - Increments `totalPendingBalance` by payment amount
6. System writes `balance.updated` ActivityLog entry with metadata:
   - `delta: { outstandingBalance: -amount, pendingBalance: +amount }`
   - `trigger: "payment.initiated"`

**Balance update (when payment is approved):**
1. Admin approves payment (pending → approved) via F014
2. System updates payment status to "approved"
3. System fetches UserSeasonBalance for (userId, teamId, seasonId)
4. System atomically:
   - Decrements `pendingBalance` by payment amount
   - Increments `approvedBalance` by payment amount
   - Sets `updatedAt` to current timestamp
5. System updates Season:
   - Decrements `totalPendingBalance` by payment amount
   - Increments `totalApprovedBalance` by payment amount
6. System writes `balance.updated` ActivityLog entry with metadata:
   - `delta: { pendingBalance: -amount, approvedBalance: +amount }`
   - `trigger: "payment.approved"`

**Balance update (when payment is disputed):**
1. Admin disputes payment (pending → disputed) via F014
2. System updates payment status to "disputed"
3. System fetches UserSeasonBalance for (userId, teamId, seasonId)
4. System atomically:
   - Decrements `pendingBalance` by payment amount
   - Increments `outstandingBalance` by payment amount (returns to unpaid state)
   - Sets `updatedAt` to current timestamp
5. System updates Season:
   - Decrements `totalPendingBalance` by payment amount
   - Increments `totalOutstanding` by payment amount
6. System writes `balance.updated` ActivityLog entry with metadata:
   - `delta: { pendingBalance: -amount, outstandingBalance: +amount }`
   - `trigger: "payment.disputed"`

**Balance update (when payment is refunded):**
1. Admin refunds an approved payment via F015
2. System updates payment status to "unpaid"
3. System fetches UserSeasonBalance for (userId, teamId, seasonId)
4. System atomically:
   - Decrements `approvedBalance` by payment amount
   - Increments `outstandingBalance` by payment amount
   - Sets `updatedAt` to current timestamp
5. System updates Season:
   - Decrements `totalApprovedBalance` by payment amount
   - Increments `totalOutstanding` by payment amount
6. System writes `balance.updated` ActivityLog entry with metadata:
   - `delta: { approvedBalance: -amount, outstandingBalance: +amount }`
   - `trigger: "payment.refunded"`

**Balance update (when fine is deleted):**
1. Admin soft-deletes a fine via F006
2. System sets fine `deletedAt` timestamp
3. System fetches the associated payment(s)
4. For each payment:
   - If status is "unpaid": decrement UserSeasonBalance `outstandingBalance` and Season `totalOutstanding`
   - If status is "pending": decrement UserSeasonBalance `pendingBalance` and Season `totalPendingBalance`
   - If status is "approved": decrement UserSeasonBalance `approvedBalance` and Season `totalApprovedBalance`
   - If status is "disputed": decrement UserSeasonBalance `outstandingBalance` and Season `totalOutstanding`
5. System writes `balance.updated` ActivityLog entry with metadata:
   - `delta` showing the specific balance field decremented
   - `trigger: "fine.deleted"`

**Balance update (when fine is restored):**
1. Admin restores a soft-deleted fine via F006
2. System clears fine `deletedAt` timestamp
3. System fetches the associated payment(s)
4. For each payment, system reverses the delete operation:
   - Increments the appropriate balance fields based on payment status
   - Same logic as deletion but with positive deltas
5. System writes `balance.updated` ActivityLog entry

**Viewing another member's balance and fines:**
1. User navigates to "Hold" tab (team overview)
2. System displays list of all active team members
3. User taps on another member's name
4. System navigates to that member's profile view
5. System displays:
   - Member name and avatar
   - UserSeasonBalance for current season (outstanding, pending, approved)
   - List of assigned fines for current season (non-deleted)
   - Payment status for each fine
6. System shows a back button in upper left corner, below the navbar
7. User taps back button
8. System navigates back to "Hold" tab (team overview)

## Edge Cases

- **No active season exists** → Balance updates are skipped; fine assignment fails per existing rules
- **UserSeasonBalance does not exist** → System creates it with initial values before applying delta
- **Season balance fields are null** → System initializes them to 0 before applying delta
- **Payment covers multiple fines (combined payment)** → Balance delta uses total payment amount
- **Fine is assigned to multiple users** → Each user gets their own UserSeasonBalance record updated
- **Network failure during balance update** → Entire transaction rolls back; balance remains consistent
- **Negative balance values** → Should never occur if logic is correct; admin tools can detect and repair
- **Season is closed** → Balance updates are still applied to the closed season (historical accuracy)
- **User leaves team** → UserSeasonBalance records are preserved (historical data)
- **Concurrent balance updates** → Firestore transactions ensure atomic updates; no race conditions
- **Member has no UserSeasonBalance record** → System shows zero balances for all fields
- **Member has no assigned fines** → Empty state shown in member profile view
- **User taps on their own name in "Hold" tab** → Navigates to their own profile (same as "Profil" tab)
- **User taps back button from their own profile** → Returns to "Hold" tab
- **Inactive members** → Not shown in "Hold" tab; cannot navigate to their profiles

## Acceptance Criteria

- UserSeasonBalance record is created for each (userId, teamId, seasonId) when first fine is assigned
- UserSeasonBalance `outstandingBalance` increases when a fine is assigned
- UserSeasonBalance `outstandingBalance` decreases and `pendingBalance` increases when payment is initiated
- UserSeasonBalance `pendingBalance` decreases and `approvedBalance` increases when payment is approved
- UserSeasonBalance `pendingBalance` decreases and `outstandingBalance` increases when payment is disputed
- UserSeasonBalance `approvedBalance` decreases and `outstandingBalance` increases when payment is refunded
- Season `totalOutstanding` reflects sum of all UserSeasonBalance `outstandingBalance` values
- Season `totalPendingBalance` reflects sum of all UserSeasonBalance `pendingBalance` values
- Season `totalApprovedBalance` reflects sum of all UserSeasonBalance `approvedBalance` values
- All balance updates are atomic with the triggering operation (fine/payment mutation)
- `balance.updated` ActivityLog entry is created for every balance change
- Balance updates work correctly for combined payments (multiple fines, single payment)
- Deleting a fine decrements the appropriate balance based on payment status
- Restoring a fine increments the appropriate balance based on payment status
- Balance fields are initialized to 0 when a new season is created
- Balances remain accurate when a season is closed (no changes to closed season balances)
- Admin can view team-level balances for current season (UI out of scope for this spec)
- Member can view their own balance for current season (UI out of scope for this spec)
- User can tap on any member name in "Hold" tab to navigate to that member's profile
- Member profile view shows UserSeasonBalance for current season (outstanding, pending, approved)
- Member profile view shows list of assigned fines for current season (excluding deleted fines)
- Member profile view shows payment status for each fine (unpaid, pending, approved, disputed)
- Back button appears in upper left corner below navbar on member profile view
- Back button navigates to "Hold" tab (team overview) when tapped
- Member profile view is accessible to all team members (both Member and Admin roles)
- Empty state is shown when member has no assigned fines in current season
