---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F002 - Bulk Fine Assignment

## Problem
Assigning the same fine to multiple members (e.g. the whole team was late) requires repeated individual assignments, which is slow and error-prone. Existing apps crash during bulk operations.

## Goal
Allow an admin to assign one fine to multiple team members in a single operation, atomically.

## Actors
- Admin

## Preconditions
- Team has at least one active Season
- At least one FineRule exists
- At least one active member in the team

## Flow

1. Admin opens "Assign Fine" screen
2. Selects a FineRule
3. Toggles to "Multiple users" mode
4. Selects 2+ users (checkboxes, "Select All" available)
5. Optionally adds a shared note
6. Confirms bulk assignment
7. System creates one Fine record per selected user
8. System creates one Payment record per user (status `unpaid`)
9. System creates one ActivityLog entry per assignment
10. UI shows summary toast: "5 fines assigned"

## Edge Cases
- Duplicate assignment (same user, same rule, same day) → warn admin, allow override
- Inactive users in selection → filter from list automatically
- Partial DB failure mid-bulk → roll back all, show error
- 0 users selected at confirm step → prevent submission
- "Select All" on large teams → paginate or virtualize list

## Acceptance Criteria
- Multiple users can be selected simultaneously
- Each selected user gets a separate Fine + Payment record
- All-or-nothing: operation is atomic (all succeed or all fail)
- ActivityLog entry created for each individual assignment
- Team overview updates to show all new fines
- Confirmation screen shows count of users before committing
- Performance: 20+ user bulk assignment completes in < 3 seconds
