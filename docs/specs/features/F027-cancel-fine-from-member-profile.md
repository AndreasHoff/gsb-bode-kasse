# F027 - Cancel Fine from Member Profile

## Problem

Admins sometimes need to retract a fine they've assigned — either because they assigned it to the wrong person, or because a payment was received wrongfully and needs to be refunded. Currently, there is no way to delete or cancel a fine without direct database access, forcing admins to manually contact support or work around the issue.

## Goal

Admins can cancel an individual fine assigned to a member directly from the member's profile view, with audit trail preservation and a confirmation dialog to prevent accidental deletion.

## Actors

- Admin (can cancel fines)
- Member (affected when fine is cancelled)

## Preconditions

- Admin is logged in and has admin role in the team
- Admin is viewing a member or admin profile accessed from the team members list ("Hold" tab)
- The member has at least one fine assigned (in any payment status: unpaid, pending, approved, or disputed)

## Flow

1. Admin opens the team members list ("Hold" tab)
2. Admin clicks on a member's name to view their profile
3. System displays the member's fines list with all assigned fines
4. Admin locates the fine to be cancelled and clicks the "Slet bøde" button for that fine
5. System displays a confirmation dialog with a warning that this action is irreversible
6. Admin confirms the cancellation (or cancels the dialog)
7. If confirmed: System soft-deletes the fine (sets `deletedAt` timestamp) and removes it from display
8. If cancelled: Dialog closes with no changes
9. System updates member profile UI to reflect the removed fine
10. System recalculates member balance to exclude the cancelled fine
11. Payment record remains in the database for audit purposes (unchanged)

## Edge Cases

- **Multiple assignees**: A fine can be assigned to multiple users. Deleting the fine cancels it for the specified user only; if other users are assigned to the same fine, their copy remains.
- **Confirmation cancelled**: User clicks "Nej" in the confirmation dialog; no changes occur.
- **Network failure during deletion**: System shows error toast and allows retry.
- **Race condition**: Another admin deletes the same fine simultaneously; second deletion fails with "Fine already deleted" message.
- **Permission denied**: Non-admin user or member without admin role attempts to delete; operation fails with permission error.
- **User tries to pay deleted fine**: Payment will fail because fine no longer exists in active fines list; clear error message shown.
- **Fine in any payment status**: Deletion is allowed regardless of payment status (unpaid, pending, approved, disputed) to support refund scenarios.

## Acceptance Criteria

- "Slet bøde" button is visible for each fine on a member's profile
- Button is only visible to users with admin role in the team
- Clicking "Slet bøde" opens a confirmation dialog with clear warning text that the action is irreversible
- Dialog has two buttons: "Slet" (confirm) and "Nej" (cancel)
- Confirming deletion soft-deletes the fine (sets `deletedAt` to current timestamp)
- After deletion, the fine is immediately removed from the member's profile view
- Fine no longer appears in team overview or season balance calculations after deletion
- Payment document remains in Firestore for audit purposes with original status intact
- If a fine is assigned to multiple users, only the specified user's assignment is cancelled
- If deletion fails due to network error, user sees error message and can retry
- If fine is already deleted (race condition), user sees appropriate error message
- Admin without permission receives permission error when attempting to delete
- Deleted fines can be queried for audit purposes (deletedAt field populated)
