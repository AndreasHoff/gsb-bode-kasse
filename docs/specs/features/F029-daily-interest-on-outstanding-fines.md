# F029 - Daily Interest on Outstanding Fines

## Problem
Members who fail to pay fines have no financial disincentive to delay payment indefinitely. The club has no way to recover late-payment risk. Without interest charges, the bødekasse loses value and members lack urgency to settle their debts.

## Goal
Automatically charge 5 DKK interest daily to members who have unpaid fines from the previous month, creating a financial incentive to pay promptly while maintaining an auditable record of all interest charges.

## Actors
- System (Cloud Function, scheduled daily)
- Member (views and pays interest)
- Admin (reviews member interest charges)

## Preconditions
- At least one member has one or more unpaid fines from a previous calendar month.
- The team's active season contains the original fine.
- The daily processing Cloud Function is deployed and configured to run at 00:01 UTC each day.

## Flow

### Daily Interest Processing (System-driven)

1. System runs a scheduled Cloud Function every day at 00:01 UTC, starting October 1, 2026.
2. For each team in the database:
   a. Query all members in that team.
   b. For each member:
      - Query all approved fines (`Fine.status` = "approved" / not deleted) that:
        - Belong to the team's active season
        - Have `createdAt` in a **previous calendar month** (not the current month)
        - Have at least one linked Payment with `status: unpaid` (not `pending`, `approved`, or `disputed`)
      - If the member has one or more such fines:
        - Check if an InterestCharge has already been created for this member, this team, today, for the same month
        - If NO: create one InterestCharge record with:
          - `amount: 5`
          - `chargedOn: today's date`
          - `month: YYYY-MM` (the month of the unpaid fines)
          - `reason: "daily_outstanding_fine_interest"`
        - If YES: skip (idempotency)
        - Atomically write an `interest.charged` ActivityLog entry
      - If the member has zero such fines: skip (no interest due)
   c. Continue to next member.
3. Log completion status (number of members charged, errors if any).

### Member Views Interest in Personal Fine List

1. Member opens "Mine Bøder" (personal debt overview).
2. System displays all unpaid fines AND all unpaid interest charges for the active season.
3. Each interest charge is displayed with:
   - Label: "Renter (5 kr)" or similar
   - Original fine(s) it relates to (e.g., "Renter fra september")
   - Charge date
   - Amount: 5 DKK
4. Interest charges are payable together with fines in a single combined payment (via F023 — MobilePay Box).

### Admin Views Interest Summary

1. Admin navigates to a new "Rentegebyr" (Interest Charges) section in the admin dashboard.
2. System displays:
   - Total members with accrued interest this season
   - List of members with interest, showing:
     - Member name
     - Number of interest charges
     - Total interest accrued
     - Month(s) affected
3. Admin can click through to see the individual InterestCharge records and linked fines.

### Interest Stops When Member Initiates Payment

1. Member initiates payment of one or more fines + interest charges (status changes to `pending`).
2. System immediately halts interest accrual for those fines.
3. Even if the admin does not approve until the next month, the member is not charged additional interest during the `pending` state.
4. If admin disputes the payment (status → `disputed`), interest accrual resumes for the next day's processing.
5. If admin approves the payment (status → `approved`), no further interest accrues.

### Interest Restarts in New Month

1. December 31, 11:59 PM — Member has November fines as `unpaid`.
2. January 1, 00:01 — Cloud Function runs and:
   - Does NOT charge interest for November fines (they are now from a previous-previous month, and seasons typically close)
   - **Important:** Interest only accrues during the month immediately following the fine's creation month, within the same season
3. If the member's November fine remains unpaid into a new season, it does not carry interest (fine and interest are scoped to the season in which they were created).

## Edge Cases
- Member has 1 unpaid fine from September and 9 unpaid fines from October → October 1 processing charges only 5 DKK interest (one charge per day per member, not per fine).
- Member has 10 unpaid fines from September, but 1 of them has a linked Payment with `status: pending` → September interest still accrues for the other 9 (pending status only blocks interest on that specific fine's payment chain).
- **Clarification:** A fine may have multiple Payment records (e.g., disputed payment reverted, member initiates again). The system checks ALL linked Payments for that fine and only blocks interest if ANY linked Payment is `pending` or `approved`.
- Member pays part of their September debt on September 30, initiating payment (status → `pending`). Admin does not approve until October 1, 01:00. Member should not be charged October 1 interest because the fine's payment is `pending`.
- Fine is deleted (soft-deleted, `deletedAt` is set) → interest accrual stops; no new charges on subsequent days.
- Team is deleted or deactivated → no further interest charges for that team.
- Cloud Function fails partway through (network error, Firestore quota exceeded) → partial charges may have been written; subsequent runs are idempotent and will not re-charge the same (member, team, month, date) tuple.
- A fine from Season 1 is unpaid. Season 1 closes and Season 2 begins. The fine remains linked to Season 1 → no interest accrues in Season 2 for that fine.
- Member initiates payment on October 1 at 23:59 UTC, but Cloud Function has not yet run (runs at 00:01 UTC the next day) → both interest charge and payment can occur; the system must handle the race condition gracefully by checking payment status *before* creating the interest charge.

## Acceptance Criteria
- Cloud Function executes daily at 00:01 UTC, starting October 1, 2026.
- Each day, the function identifies all members with one or more unpaid fines from the previous calendar month within the active season.
- For each qualifying member, exactly one InterestCharge of 5 DKK is created (idempotent: running the function twice on the same date does not create duplicate charges).
- InterestCharge records include: `userId`, `teamId`, `seasonId`, `chargedOn`, `month`, `amount: 5`, `reason: "daily_outstanding_fine_interest"`.
- An `interest.charged` ActivityLog entry is written atomically with each new InterestCharge.
- Interest charges are visible to both members and admins in the fine list and interest summary respectively.
- Fines from the current calendar month do not generate interest.
- When a fine's linked Payment transitions to `pending` status, interest accrual stops for that fine immediately (no charge on the next day's run).
- When a fine's linked Payment is disputed (status → `disputed`), interest resumes accruing on the next day's run.
- When a fine's linked Payment is approved (status → `approved`), interest never accrues again for that fine.
- Interest accrual is scoped to the season in which the original fine was created; fines do not carry interest across seasons.
- Members can pay multiple interest charges and fines together in a single combined payment via the MobilePay Box (F023).
- Admin dashboard displays total members with accrued interest and allows drill-down to individual member interest records.
- Soft-deleted fines (with `deletedAt` set) do not generate interest.
- The function logs execution summary (members charged, errors, timestamp).

## Domain Model Changes
- New entity: `InterestCharge`
  ```typescript
  interface InterestCharge {
    id: string;                    // UUID
    userId: string;                // Reference to User
    teamId: string;                // Reference to Team
    seasonId: string;              // Reference to Season (scoped)
    amount: number;                // Always 5 (DKK)
    chargedOn: string;             // ISO 8601 date (YYYY-MM-DD)
    month: string;                 // YYYY-MM (e.g., "2026-09" for Sept fines)
    reason: string;                // Always "daily_outstanding_fine_interest"
    createdAt: string;             // Timestamp of creation
  }
  ```
- `ActivityLog` gains new action type: `interest.charged`

## Future Enhancements
- V2: Make interest rate configurable per team (e.g., 5 DKK, 10 DKK, or percentage-based).
- V2: Add a grace period (e.g., no interest until day 3 of the month, or after 7 days unpaid).
- V2: Implement admin override to manually forgive interest for specific members.
- V3: Integrate interest charges into the Vipps MobilePay API reconciliation (F023 future enhancement).
