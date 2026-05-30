---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F004 - Team Overview (Shared Debt View)

## Problem
The team needs a single shared view of all outstanding fines and balances so members and admins can see the full picture transparently.

## Goal
Provide a real-time, sorted list of all team members with their total outstanding debt for the active season.

## Actors
- Member, Admin

## Flow

1. User opens app to Team Overview screen
2. App loads current active season's data
3. Displays ranked list of members by total unpaid debt (descending)
4. Each row shows: avatar, name, total debt, number of unpaid fines
5. Tapping a member opens their personal fine list
6. "Recent Activity" feed below the leaderboard shows last 10 actions

## Data Aggregation
- Total debt = sum of all Payment records with status `unpaid` or `pending`
- Pending payments are shown with a visual indicator (⏳)
- Approved payments do not count toward debt

## Edge Cases
- Active season has no fines yet → show empty state with encouragement copy
- All members have 0 debt → show celebratory state
- Season not set → prompt admin to create a season

## Acceptance Criteria
- Overview loads in < 1 second on mobile
- Debt totals are accurate (unpaid + pending)
- Members with 0 debt appear at the bottom of the list
- Pending payments visually distinct from unpaid
- Tapping a member navigates to their detail view
- Overview auto-refreshes when returning from fine assignment flow
