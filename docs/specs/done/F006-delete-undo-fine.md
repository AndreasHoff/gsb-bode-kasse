---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F006 - Delete / Undo Fine

## Problem
Admins sometimes assign fines by mistake and need a way to reverse them. The system must support undo without permanently destroying data.

## Goal
Allow an admin to soft-delete a fine assignment, with the option to restore it within a reasonable window.

## Actors
- Admin

## Preconditions
- Fine exists and has not been paid (status is `unpaid`)
- Actor has sufficient role permissions

## Flow

### Delete
1. Admin views fine (in team overview or user detail)
2. Taps "Delete" / swipe-to-delete
3. Confirmation dialog: "Slet bøde til [name]?"
4. Confirms deletion
5. Fine's `deletedAt` is set (soft delete)
6. Payment record marked as void
7. ActivityLog entry created (`fine.deleted`)
8. UI removes fine from active views immediately
9. Toast shown: "Bøde slettet. Fortryd?"

### Undo (within session / 10 seconds)
10. User taps "Fortryd" in toast
11. Fine's `deletedAt` is cleared
12. Payment restored to `unpaid`
13. ActivityLog entry created (`fine.restored`)
14. Fine reappears in views

## Edge Cases
- Fine is in `pending` or `approved` payment state → deletion not allowed; must dispute instead
- Admin deletes own fine assignment → allowed
- Member tries to delete a fine directly → not allowed
- Restore after toast expires → must be done via ActivityLog admin view

## Acceptance Criteria
- Soft-deleted fines do not appear in active overviews
- Undo toast shown for at least 8 seconds after deletion
- Tapping undo restores fine instantly
- ActivityLog records both delete and restore events
- Only unpaid fines can be deleted via this flow
- Deleted fines visible to Admins in audit view
