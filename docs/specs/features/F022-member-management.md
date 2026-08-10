# F022 - Member Management

## Problem
Admins have no way to manage the member roster in the app — they cannot change a member's role or remove members who have left the club. Members accumulate without a way to clean up, and there is no way to promote a member to admin from within the app.

## Goal
Give admins a member roster UI where they can promote/demote members and remove leavers, cascading their fine debt.

## Actors
- Admin (and Super-admin)

## Preconditions
- User is authenticated with admin role in the team.

## Flow

**Viewing roster:**
1. Admin navigates to Indstillinger → Medlemmer.
2. System loads all active memberships for the team and their corresponding user profiles.
3. System renders a list showing each member's name, role badge, and action buttons.

**Changing a role:**
1. Admin taps "Gør til admin" or "Gør til medlem" next to a member.
2. System updates the membership role in Firestore and writes a `member.roleChanged` ActivityLog entry.
3. List refreshes to show the updated role.

**Removing a member:**
1. Admin taps "Fjern" next to a member.
2. System shows an inline confirmation: "Er du sikker? Alle [name]s bøder slettes også."
3. Admin confirms.
4. System deactivates the membership (`isActive: false`) and soft-deletes all fines assigned to that user, writing a `member.removed` ActivityLog entry and individual `fine.deleted` entries.
5. Member disappears from the roster.

## Edge Cases
- Admin attempting to remove themselves → blocked with message "Du kan ikke fjerne dig selv."
- Admin attempting to demote the last admin → blocked with message "Holdet skal have mindst én admin."
- Network failure during role change or removal → error message shown, state unchanged.
- Member has no fines → removal still deactivates membership successfully.
- Non-admin accessing the section → tab not visible in nav.

## Acceptance Criteria
- All active members shown with name and role badge.
- Admin can promote a member to admin role.
- Admin can demote an admin to member role (unless they are the last admin).
- Demotion of the last admin is blocked with an error message.
- Admin cannot remove themselves (blocked with error message).
- Removing a member deactivates their membership (`isActive: false`) in Firestore.
- All fines assigned to the removed member are soft-deleted (`deletedAt` set).
- `member.removed` ActivityLog entry is written when a member is removed.
- Action buttons are disabled while a request is in flight.
- Removed member no longer appears in the roster after removal.
