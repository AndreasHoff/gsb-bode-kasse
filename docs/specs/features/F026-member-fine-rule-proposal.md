# F026 - Member Fine Rule Proposal

## Problem

Currently, only admins can create and manage the fine rule catalogue. Regular team members have no mechanism to suggest new fine rules that might improve the team's fine culture, limiting community input into the catalogue and centralizing all decision-making to admins.

## Goal

Members can propose new fine rules to the catalogue. Admins review each proposal and approve (adding it to the active catalogue) or deny (removing it permanently) before members and other users see it.

## Actors

- Member
- Admin

## Preconditions

- User is an active member of a team
- Team has at least one active season

## Flow

### Member Proposes a Fine Rule

1. Member navigates to the Bøder tab
2. Member is shown a "Ny bøde forslag" button (Members do not see the "+ Ny bøde" button)
3. Member taps "Ny bøde forslag"
4. System displays the fine rule creation form (identical fields to admin's "+ Ny bøde" form)
5. Member fills in: title, description (optional), amount, emoji (optional)
6. Member taps "Opret forslag"
7. System validates the form (same validation as regular fine rule creation)
8. System saves the proposal to Firestore with:
   - Status: `pending`
   - Proposer user ID and name (for traceability)
   - Team ID (scoped to team)
   - Timestamp
9. System displays a confirmation message (e.g., "Dit forslag er modtaget")
10. System redirects member to the Bøder tab or member's proposal list

### Member Views and Manages Their Own Proposals

11. Member can access a "Mine forslag" view or see pending proposals on the Bøder tab
12. Member sees a list of their pending proposals with: title, amount, status
13. Member taps a proposal to view full details
14. Member can edit the proposal form while status is `pending`
15. Member taps "Gem ændringer" to save edits
16. System updates the proposal in Firestore
17. Member can tap "Slet forslag" to retract the proposal
18. System deletes the proposal permanently (hard delete)
19. Once a proposal is `approved` or `denied`, it becomes read-only; member cannot edit or retract

### Admin Reviews Pending Proposals

20. Admin navigates to the Bøder tab
21. Admin sees "+ Ny bøde" button (for direct fine rule creation)
22. Admin sees "Nye bøde forslag {numberOfPendingProposals}" button next to it
23. If numberOfPendingProposals is 0, the button is disabled (grayed out)
24. If numberOfPendingProposals ≥ 1, the button is enabled
25. Admin taps the button
26. System displays a list view of all pending proposals for the team with:
    - Title
    - Amount
    - Emoji (if set)
    - Proposer member name
27. Admin taps a proposal to view details
28. System displays the full proposal with all fields and two action buttons: "Godkend" and "Afvis"
29. Admin taps "Godkend"
30. System creates a new FineRule in the catalogue with the proposal's data
31. System creates an ActivityLog entry: action = `rule.proposed_approved`, entityType = `fine_rule_proposal`, metadata includes proposer name
32. System changes proposal status to `approved`
33. System deletes the proposal from the active pending list (hard delete)
34. Admin taps "Afvis"
35. System creates an ActivityLog entry: action = `rule.proposed_denied`, entityType = `fine_rule_proposal`, metadata includes proposer name
36. System deletes the proposal permanently (hard delete)

### Badge Indicator (Real-Time)

37. On the Bøder tab (or bottom navbar), a badge displays the count of pending proposals
38. When a new proposal is submitted, the badge count increases immediately
39. When a proposal is approved or denied, the badge count decreases immediately
40. When the count reaches 0, the badge disappears

### Admin Notification

41. When a member submits a new proposal, all admins of the team receive a notification
42. Notification indicates: member name, fine rule title, and link to review proposals
43. Notification timing and delivery mechanism are defined in the notification feature spec (TBD)

## Edge Cases

- **Duplicate proposals**: Two members propose identical or very similar rules → Both proposals coexist; admins manage manually
- **Collision with direct rule creation**: Admin creates a fine rule that matches a pending proposal → Both coexist independently
- **Proposal author removed from team**: Member is deactivated but has pending proposals → Proposals persist in Firestore for audit trail
- **Simultaneous submissions**: Multiple members submit proposals at the same time → All proposals are saved independently
- **Member edits during admin review**: Member edits a proposal while admin is reviewing it → Only latest version is saved; admin may see stale data until page refresh
- **Member deletes proposal in-flight**: Member retracts proposal right as admin is viewing it → Admin sees stale data; viewing deleted proposal fails gracefully
- **Network failure during submission**: Member loses connection while creating proposal → User sees error message and can retry
- **Duplicate submission click**: Member double-taps "Opret forslag" → System prevents duplicate submissions (debounce or disable button)
- **Proposer metadata**: When proposal is approved to a FineRule, proposer name is recorded in proposal history, but the FineRule's `createdBy` is the approving admin
- **Proposal edited after partial approval workflow**: If a proposal changes state to `approved` or `denied`, member cannot edit it
- **Team has no active season**: Member cannot submit proposal if no active season exists (same constraint as fine rule creation)

## Acceptance Criteria

- Member can tap "Ny bøde forslag" button on Bøder tab
- Proposal form contains fields: title, description (optional), amount, emoji (optional) — identical to fine rule creation form
- Proposal is saved to Firestore with status `pending`, proposer user ID, proposer name, team ID, and timestamp
- Member can view a list of their own pending proposals
- Member can tap a pending proposal to edit or retract it
- Member cannot edit or retract a proposal after it is approved or denied
- Admin sees "Nye bøde forslag {X}" button on Bøder tab, disabled when X = 0
- Admin can tap the button to view a list of all team pending proposals with proposer names visible
- Admin can approve a proposal, which creates a new FineRule and deletes the proposal
- Admin can deny a proposal, which deletes it permanently
- ActivityLog entry is created for each approval (`rule.proposed_approved`) with proposer metadata
- ActivityLog entry is created for each denial (`rule.proposed_denied`) with proposer metadata
- Badge indicator on Bøder tab shows count of pending proposals
- Badge updates in real-time without requiring page refresh
- Badge disappears when count reaches 0
- All admins of the team are notified when a new proposal is submitted
- Proposal data is scoped to the team (proposals cannot be shared across teams)
