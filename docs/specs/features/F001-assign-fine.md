# F001 - Assign Fine to Single User

## Problem
Admins need a fast, low-friction way to assign a fine to one member after a rule violation.

## Goal
Allow an admin to assign a fine to a single team member in under 5 taps, with optional note.

## Actors
- Admin

## Preconditions
- Team has at least one active Season
- At least one FineRule exists for the team
- Target user is an active member of the team

## Flow

1. Admin opens "Assign Fine" screen
2. Selects a FineRule from the list (or creates a custom one)
3. Selects target user from active member list
4. Optionally adds a note
5. Confirms assignment
6. System creates Fine record with single assignedTo entry
7. System creates Payment record with status `unpaid`
8. System creates ActivityLog entry (`fine.assigned`)
9. UI shows success toast, returns to overview

## Edge Cases
- No active season → show error, redirect to season management
- No fine rules exist → offer quick rule creation inline
- Target user is inactive → filter them from selectable list
- Admin assigns fine to themselves → allowed, no restriction

## Acceptance Criteria
- Fine appears in team overview immediately after assignment
- Fine appears in target user's personal debt view
- ActivityLog entry is created
- Payment record is created with status `unpaid`
- Assignment can be undone (soft delete) within session
