# F026 Implementation Tasks

## Epic: Member Fine Rule Proposals

**Goal**: Enable members to propose fine rules; admins review and approve/deny.

**Status**: Ready for implementation

---

## Phase 1: Foundation — Data Model & Types

### Task 1.1: Add FineRuleProposal Type

**What**: Add `FineRuleProposal` interface to `src/types/domain.ts`

**Acceptance**:
- [ ] Type is exported from domain.ts
- [ ] All fields match spec: id, teamId, proposedBy, proposedByName, title, description, amount, emoji, status, seasonId, createdAt, approvedAt, deniedAt
- [ ] `status` is a literal type: `"pending" | "approved" | "denied"`
- [ ] TypeScript compiles with no errors

**Notes**:
- No soft delete for proposals (hard delete after approval/denial)
- `proposedByName` is snapshot (following FeatureProposal pattern)

---

### Task 1.2: Add Permission Helpers

**What**: Add helpers to `src/lib/permissions.ts` for proposal-related checks

**Acceptance**:
- [ ] `canProposeFineRules(role)` — returns `true` for all roles (members and admins can propose)
- [ ] `canReviewProposals(role)` — returns `true` for admin only
- [ ] Helpers are exported
- [ ] Used consistently throughout the feature

**Notes**:
- Members can propose (culture-first philosophy)
- Only admins review

---

### Task 1.3: Update Domain Entities Spec

**What**: Add FineRuleProposal to `docs/specs/domain/entities.md`

**Acceptance**:
- [ ] FineRuleProposal section added after FineRule
- [ ] All fields documented with descriptions
- [ ] Business rules section covers: team scoping, hard-delete behavior, status transitions
- [ ] ActivityLog actions documented: `rule.proposal_created`, `rule.proposal_approved`, `rule.proposal_denied`

**Notes**:
- Reference the spec flow for status transitions
- Clarify that proposals are never soft-deleted

---

## Phase 2: Member Submission — Proposal Creation

### Task 2.1: Create ProposalForm Component

**What**: React component for members to submit fine rule proposals

**File**: `src/features/fine-rules/ProposalForm.tsx`

**Acceptance**:
- [ ] Form displays fields: title (required), description (optional), amount (required), emoji (optional)
- [ ] Fields are identical to FineRuleForm component (reuse validation logic)
- [ ] Form validates: amount > 0, title not empty
- [ ] "Opret forslag" button (not "Opret") to distinguish from direct rule creation
- [ ] Mobile-first layout at 430px
- [ ] No horizontal scroll at mobile width
- [ ] Styled using Tailwind v4 (`@import "tailwindcss"`)

**Notes**:
- Can reuse or extract shared form fields from FineRuleForm
- Danish copy: "Opret forslag" (Create proposal)
- Clear error messages in Danish

---

### Task 2.2: Create useProposalSubmit Hook

**What**: Hook for proposal submission logic

**File**: `src/features/fine-rules/useProposalSubmit.ts`

**Acceptance**:
- [ ] Hook handles form submission
- [ ] Validates proposal data
- [ ] Saves to `proposals` Firestore collection with:
  - `status: "pending"`
  - `proposedBy: currentUserId`
  - `proposedByName: currentUserName`
  - `teamId: activeTeamId`
  - `seasonId: activeSeasonId` (or retrieve it)
  - `createdAt: now`
- [ ] Creates ActivityLog entry: action = `rule.proposal_created`, entityType = `fine_rule_proposal`, metadata includes proposedByName
- [ ] Returns: `{ loading, error, success }`
- [ ] Handles errors gracefully (show toast with error message)

**Notes**:
- Verify active season exists before allowing submission
- Use Firestore `addDoc` or `setDoc` with auto-ID
- Include proposedByName in ActivityLog metadata for audit trail

---

### Task 2.3: Create Confirmation Flow

**What**: Toast/confirmation message after successful submission

**Acceptance**:
- [ ] After successful submission, show toast: "Dit forslag er modtaget" (Your proposal has been received)
- [ ] Toast auto-dismisses after 3-4 seconds or manual close
- [ ] Redirect to MyProposals view or Bøder tab
- [ ] Redirect uses React Router navigation

**Notes**:
- Use existing UndoToast component or create similar pattern
- Danish copy must match spec exactly

---

## Phase 3: Member Management — Own Proposals

### Task 3.1: Create MyProposals Component

**What**: List of member's own proposals

**File**: `src/features/fine-rules/MyProposals.tsx`

**Acceptance**:
- [ ] Displays list of proposals where `proposedBy === currentUserId`
- [ ] Each item shows: title, amount, status (pending/approved/denied)
- [ ] Tap/click to navigate to ProposalDetail
- [ ] Loading state while fetching
- [ ] Empty state if no proposals
- [ ] Mobile-first, no horizontal scroll
- [ ] Real-time updates via Firestore listener

**Notes**:
- Filter by `teamId === activeTeamId` and `seasonId === activeSeasonId` (or show all seasons?)
- Sort by createdAt descending (newest first)
- Use `formatAmount()` from utils for display

---

### Task 3.2: Create ProposalDetail Component

**What**: View, edit, or retract a single proposal

**File**: `src/features/fine-rules/ProposalDetail.tsx`

**Acceptance**:
- [ ] Displays all proposal fields (read-only if approved/denied)
- [ ] If status = `pending`:
  - [ ] Edit button → ProposalForm with pre-filled data
  - [ ] Retract button → Confirmation dialog → Delete
- [ ] If status = `approved` or `denied`:
  - [ ] Read-only view
  - [ ] No edit/retract buttons
  - [ ] Shows approval/denial timestamp
- [ ] Back navigation
- [ ] Mobile-first

**Notes**:
- Reuse ProposalForm component for editing
- Retract = hard delete from Firestore
- Show status badge with appropriate styling (pending = yellow/warning, approved = green, denied = gray)

---

### Task 3.3: Create useProposalEdit Hook

**What**: Hook for editing and retracting proposals

**File**: `src/features/fine-rules/useProposalEdit.ts`

**Acceptance**:
- [ ] `updateProposal(proposalId, data)` — Updates proposal fields
  - [ ] Only allows edits if status = pending
  - [ ] Saves to Firestore
  - [ ] Does NOT create ActivityLog entry (edits are not audit-logged per spec)
- [ ] `retractProposal(proposalId)` — Deletes proposal
  - [ ] Only allows if status = pending
  - [ ] Hard-deletes from Firestore
  - [ ] Does NOT create ActivityLog entry for retraction
- [ ] Returns: `{ loading, error, success }`

**Notes**:
- Per spec, edits and retractions are not logged (only creation, approval, denial are logged)
- Confirmation dialog for retraction to prevent accidental deletes

---

## Phase 4: Admin Review — Proposal Approval

### Task 4.1: Create AdminProposalList Component

**What**: List of all pending proposals for the team

**File**: `src/features/fine-rules/AdminProposalList.tsx`

**Acceptance**:
- [ ] Visible only to admins (check `canReviewProposals(role)`)
- [ ] Displays all proposals where `teamId === activeTeamId` and `status === "pending"`
- [ ] Each item shows: title, amount, emoji, proposer name
- [ ] Tap/click to navigate to AdminProposalDetail
- [ ] Loading state
- [ ] Empty state if no pending proposals
- [ ] Mobile-first
- [ ] Real-time updates via Firestore listener

**Notes**:
- Show proposer name prominently (transparency)
- Sort by createdAt ascending (oldest first, FIFO review)
- Consider pagination if many proposals

---

### Task 4.2: Create AdminProposalDetail Component

**What**: Review and approve/deny a proposal

**File**: `src/features/fine-rules/AdminProposalDetail.tsx`

**Acceptance**:
- [ ] Displays all proposal fields (read-only)
- [ ] Shows proposer name prominently
- [ ] Two action buttons: "Godkend" (Approve) and "Afvis" (Deny)
- [ ] Both buttons show confirmation dialog before proceeding
- [ ] After approval/denial, redirect to AdminProposalList
- [ ] Back navigation
- [ ] Mobile-first

**Notes**:
- Danish copy: "Godkend" = Approve, "Afvis" = Deny
- Confirmation: "Godkende dette forslag?" / "Afvise dette forslag?"
- Disable buttons during processing

---

### Task 4.3: Create useProposalApproval Hook

**What**: Hook for approving and denying proposals

**File**: `src/features/fine-rules/useProposalApproval.ts`

**Acceptance**:
- [ ] `approveProposal(proposalId)` — Creates FineRule, deletes proposal
  - [ ] Fetches proposal data
  - [ ] Creates FineRule in `fine_rules` collection with:
    - title, description, amount, emoji from proposal
    - `createdBy: currentAdminId` (NOT proposedBy)
    - `isActive: true`
    - `teamId: proposal.teamId`
    - Current timestamp
  - [ ] Deletes proposal from Firestore
  - [ ] Creates ActivityLog entry:
    - action = `rule.proposal_approved`
    - entityType = `fine_rule_proposal`
    - entityId = `proposalId`
    - metadata = `{ proposedByName: proposal.proposedByName, ruleId: newRuleId }`
- [ ] `denyProposal(proposalId)` — Deletes proposal
  - [ ] Deletes proposal from Firestore
  - [ ] Creates ActivityLog entry:
    - action = `rule.proposal_denied`
    - entityType = `fine_rule_proposal`
    - entityId = `proposalId`
    - metadata = `{ proposedByName: proposal.proposedByName }`
- [ ] Both operations return: `{ loading, error, success }`
- [ ] Handle race conditions gracefully (proposal already deleted, etc.)

**Notes**:
- Atomic operations: either approve succeeds completely or fails cleanly
- Include proposedByName in ActivityLog for audit trail
- FineRule creation uses admin's ID as `createdBy`, NOT proposedBy

---

## Phase 5: UI Integration & Real-Time

### Task 5.1: Update FineCatalog Component

**What**: Add conditional buttons and routing to FineCatalog screen

**File**: `src/features/fine-rules/FineCatalog.tsx` (or routing file)

**Acceptance**:
- [ ] If admin: Show "+ Ny bøde" button (direct rule creation) + "Nye bøde forslag {X}" button
- [ ] If member: Show "Ny bøde forslag" button (no direct "+ Ny bøde")
- [ ] "Nye bøde forslag {X}" button is disabled if X = 0
- [ ] "+ Ny bøde" button routes to new FineRuleForm
- [ ] "Ny bøde forslag" button routes to ProposalForm
- [ ] "Nye bøde forslag {X}" button routes to AdminProposalList
- [ ] Routes use React Router (check existing routing pattern)

**Notes**:
- Use permission helpers `canManageFineRules()` for admins, `canProposeFineRules()` for members
- Badge count comes from real-time listener
- Button text in Danish

---

### Task 5.2: Add Pending Proposals Badge

**What**: Badge on Bøder tab (or bottom navbar) showing pending proposal count

**Files**: 
- `src/features/fine-rules/FineCatalog.tsx` (or component that manages badge)
- `src/components/BottomNavbar.tsx` (if badge appears here)
- `src/features/fine-rules/fine-rules.css` (or global styles)

**Acceptance**:
- [ ] Badge displays count of pending proposals for active team
- [ ] Badge is disabled/hidden when count = 0
- [ ] Badge updates in real-time (Firestore listener)
- [ ] Badge appears next to "Bøder" tab or near buttons
- [ ] Styling: small circle with number, red/orange background (alert color)
- [ ] Mobile and desktop layout looks good
- [ ] No horizontal scroll

**Notes**:
- Only admins see this badge (or general availability depends on spec — review)
- Use Firestore `onSnapshot` listener to update badge in real-time
- Consider: Should members also see pending count? Spec suggests admin only.

---

### Task 5.3: Create Routing/Navigation

**What**: Add routes for new proposal screens

**File**: Check existing routing in `src/App.tsx` or feature router

**Acceptance**:
- [ ] ProposalForm route: `/bøder/proposal/new`
- [ ] MyProposals route: `/bøder/my-proposals` (or similar)
- [ ] ProposalDetail route: `/bøder/proposal/:id`
- [ ] AdminProposalList route: `/bøder/admin/proposals` (or similar)
- [ ] AdminProposalDetail route: `/bøder/admin/proposals/:id`
- [ ] Routes are guarded by permissions (members can't access admin routes)
- [ ] Navigation works on mobile and desktop

**Notes**:
- Check existing fine-rules routing pattern
- Use React Router v6+ if available
- Permissions checked in component or route guard

---

## Phase 6: Notifications (Deferred)

**Status**: TBD — Depends on notification feature spec (F0XX-notifications.md)

**Placeholder Task 6.1: Admin Notifications**

When a member submits a proposal:
- [ ] All admins of the team receive a notification
- [ ] Notification includes: member name, proposal title, link to review
- [ ] Notification is delivered via [mechanism TBD in notification spec]

---

## Testing Checklist

### Manual E2E Testing (Mobile @ 430px)

- [ ] Member submits proposal → Confirmation → Appears in MyProposals
- [ ] Member edits pending proposal → Changes saved → MyProposals updated
- [ ] Member retracts proposal → Confirmation → Disappears from MyProposals
- [ ] Admin views AdminProposalList → Count is accurate → Real-time updates
- [ ] Admin approves proposal → Proposal deleted → FineRule appears in catalogue
- [ ] Admin denies proposal → Proposal deleted → Not in catalogue
- [ ] ActivityLog entries created for approval/denial
- [ ] Badge count decreases after approval/denial
- [ ] Proposal is read-only after approval/denial (no edit/retract buttons)
- [ ] All forms responsive, no horizontal scroll
- [ ] All buttons and links work on touch

### Desktop Testing @ 1024px+

- [ ] Layouts look good
- [ ] Core content constrained to mobile width (430px) unless spec overrides
- [ ] No horizontal scroll

### TypeScript Check

- [ ] `npx tsc --noEmit` returns zero errors
- [ ] All new functions are typed
- [ ] All Firestore queries are typed

---

## Acceptance Criteria Verification

After implementation, verify each acceptance criterion from F026-member-fine-rule-proposal.md:

- [ ] Member can tap "Ny bøde forslag" button on Bøder tab
- [ ] Proposal form contains fields: title, description (optional), amount, emoji (optional)
- [ ] Proposal is saved to Firestore with status `pending`, proposer user ID, proposer name, team ID, and timestamp
- [ ] Member can view a list of their own pending proposals
- [ ] Member can tap a pending proposal to edit or retract it
- [ ] Member cannot edit or retract a proposal after it is approved or denied
- [ ] Admin sees "Nye bøde forslag {X}" button on Bøder tab, disabled when X = 0
- [ ] Admin can tap the button to view a list of all team pending proposals with proposer names visible
- [ ] Admin can approve a proposal, which creates a new FineRule and deletes the proposal
- [ ] Admin can deny a proposal, which deletes it permanently
- [ ] ActivityLog entry is created for each approval (`rule.proposal_approved`) with proposer metadata
- [ ] ActivityLog entry is created for each denial (`rule.proposal_denied`) with proposer metadata
- [ ] Badge indicator on Bøder tab shows count of pending proposals
- [ ] Badge updates in real-time without requiring page refresh
- [ ] Badge disappears when count reaches 0
- [ ] [Notifications deferred to F0XX-notifications]
- [ ] Proposal data is scoped to the team (proposals cannot be shared across teams)

---

## Summary

**Total Tasks**: 13 main tasks across 6 phases

**Estimated Effort**: 
- Phase 1 (Foundation): 2–3 hours
- Phase 2 (Member Submission): 3–4 hours
- Phase 3 (Member Management): 3–4 hours
- Phase 4 (Admin Review): 3–4 hours
- Phase 5 (UI Integration): 2–3 hours
- Phase 6 (Notifications): TBD (deferred)

**Total (excl. Phase 6)**: ~13–18 hours

**Order of Execution**: 1 → 2 → 3 → 4 → 5 (then 6 when notification spec is ready)

**Quality Gates**:
- TypeScript: Zero errors
- E2E manual testing: All scenarios pass on mobile 430px and desktop 1024px+
- Acceptance criteria: 100% verified
- ActivityLog: All mutations logged correctly
- Firestore: Data scoped to team, real-time updates working
