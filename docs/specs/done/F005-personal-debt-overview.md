---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F005 - Personal Debt Overview

## Problem
Members need a clear personal view of their own outstanding fines, payment history, and total debt.

## Goal
Provide each user a personal dashboard showing all fines assigned to them for the active season, grouped by status.

## Actors
- Member, Admin

## Flow

1. User opens "My Fines" / personal tab
2. App loads all fines assigned to the current user for the active season
3. Displays:
   - Total unpaid amount (large, prominent)
   - List of unpaid fines (sorted by date, newest first)
   - List of pending fines (payment initiated, awaiting approval)
   - Collapsible: paid fines history
4. "Pay All" button if > 0 unpaid fines
5. Individual "Pay" button per fine
6. Tapping a fine shows detail: title, amount, assigned by, date, note

## Edge Cases
- No fines assigned → show positive empty state
- All fines paid → show "All clear" celebration
- Mix of active season + showing historical → filter by season selector

## Acceptance Criteria
- Total outstanding amount shown prominently at top
- Unpaid fines listed with title, amount, date
- "Pay" and "Pay All" trigger F003 MobilePay flow
- Pending fines show ⏳ indicator with "Awaiting approval" text
- Paid fines shown in collapsible history section
- Navigating back from MobilePay refreshes the view
