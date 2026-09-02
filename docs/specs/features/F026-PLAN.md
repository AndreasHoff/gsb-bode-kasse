# F026 Implementation Plan — Member Fine Rule Proposals

## Overview

F026 enables team members to propose new fine rules to the catalogue, which admins review and approve/deny before they're visible to the team. This shifts fine rule creation from admin-only to community-driven with admin validation.

## Strategic Goals

- ✅ Empower members to contribute to team culture
- ✅ Preserve admin control over what rules enter the catalogue
- ✅ Maintain audit trail of proposals and decisions
- ✅ Real-time feedback for all stakeholders (members see their proposals, admins see pending count)

## Data Model

### New Entity: FineRuleProposal

```ts
interface FineRuleProposal {
  id: string;
  teamId: string;
  proposedBy: string;           // User ID
  proposedByName: string;        // Snapshot of user name
  title: string;
  description?: string;
  amount: number;
  emoji?: string;
  status: "pending" | "approved" | "denied";
  seasonId: string;              // Scoped to active season at proposal time
  createdAt: string;
  approvedAt?: string;
  deniedAt?: string;
}
```

**Why this structure:**
- `proposedByName` is a snapshot to preserve history (similar to FeatureProposal pattern)
- `status` tracks proposal lifecycle
- Scoped to `teamId` and `seasonId` for multi-tenant isolation
- Timestamps support audit trail

### ActivityLog Actions

- `rule.proposal_created` — member submits proposal
- `rule.proposal_approved` — admin approves, creates FineRule
- `rule.proposal_denied` — admin rejects proposal

## Permission Model

- **Members** can:
  - Create fine rule proposals
  - View their own pending proposals
  - Edit their own pending proposals
  - Retract (soft-delete) their own pending proposals
  - View proposal status (approved/denied) after decision
  - **Cannot**: Edit/retract approved or denied proposals

- **Admins** can:
  - Create fine rules directly (existing "+ Ny bøde" button)
  - View all team pending proposals
  - Approve proposals (creates FineRule, deletes proposal)
  - Deny proposals (deletes proposal)
  - Cannot: Edit proposals (members own editing)

## UI/UX Strategy

### Member Experience

**On Bøder tab:**
- If admin: Show "+ Ny bøde" and "Nye bøde forslag {X}" button
- If member: Show "Ny bøde forslag" button (no direct "+ Ny bøde")
- Bøde rules are shown (approved rules only)

**New screens:**
1. **ProposalForm** — Submit new proposal (same fields as FineRuleForm)
2. **MyProposals** — List member's own proposals with status
3. **ProposalDetail** — View & edit/retract if pending
4. **AdminProposalList** — All pending proposals for team
5. **AdminProposalDetail** — Review & approve/deny

**Badge/Real-time:**
- Badge on Bøder tab shows pending count (disabled if 0)
- Real-time updates via Firestore listeners

### UX Transitions

```
Member submits proposal
  ↓
Confirmation message → "Dit forslag er modtaget"
  ↓
Redirect to MyProposals view
  
Admin reviews
  ↓
Approves → Creates FineRule, deletes proposal, ActivityLog entry
Denies → Deletes proposal, ActivityLog entry
```

## Implementation Phases

### Phase 1: Data & Backend (Foundation)

**Files to create/modify:**
1. Add `FineRuleProposal` type to `src/types/domain.ts`
2. Add permission helpers to `src/lib/permissions.ts` (for future, currently use `canManageFineRules`)
3. Create Firestore schema document (proposals collection)

**Actions:**
- Define collection structure
- Define security rules (members can create own, admins can view all)
- Add activity log action types to domain spec

### Phase 2: Member Proposal Submission (Member Flow)

**Files to create:**
1. `src/features/fine-rules/ProposalForm.tsx` — New form component
2. `src/features/fine-rules/useProposalSubmit.ts` — Hook for submission logic
3. `src/features/fine-rules/ProposalForm.css` — Styling

**Actions:**
- Reuse FineRuleForm fields (title, description, amount, emoji)
- Validate same way as FineRule creation
- Save to `proposals` collection with status=pending
- Create ActivityLog entry `rule.proposal_created`
- Show confirmation toast and redirect

**Acceptance:**
- Form submits and saves to Firestore
- Confirmation message displays
- ActivityLog entry created with metadata (proposer name)

### Phase 3: Member Proposal Management (Member Flow)

**Files to create:**
1. `src/features/fine-rules/MyProposals.tsx` — List own proposals
2. `src/features/fine-rules/ProposalDetail.tsx` — View & edit/retract
3. `src/features/fine-rules/useProposalEdit.ts` — Edit/delete logic
4. Update `src/features/fine-rules/FineCatalog.tsx` or create routing

**Actions:**
- Query proposals where `proposedBy === currentUserId` and `teamId === activeTeam`
- Show list with title, amount, status
- Allow edit/retract only if status=pending
- Redirect to view after save

**Acceptance:**
- Can view own proposals
- Can edit pending proposals
- Can retract proposals
- Read-only for approved/denied

### Phase 4: Admin Review & Approval (Admin Flow)

**Files to create:**
1. `src/features/fine-rules/AdminProposalList.tsx` — All pending proposals
2. `src/features/fine-rules/AdminProposalDetail.tsx` — Approve/deny
3. `src/features/fine-rules/useProposalApproval.ts` — Approval/denial logic

**Actions:**
- Query all proposals where `teamId === activeTeam` and `status === "pending"`
- On approve: Create FineRule, delete proposal, ActivityLog entry
- On deny: Delete proposal, ActivityLog entry
- Badge updates real-time

**Acceptance:**
- Can view all pending proposals
- Can approve (creates FineRule)
- Can deny (hard-deletes proposal)
- ActivityLog entries created

### Phase 5: UI Integration & Real-Time (Polish)

**Files to modify:**
1. `src/features/fine-rules/FineCatalog.tsx` — Add button/routing logic
2. `src/components/BottomNavbar.tsx` — Add badge to Bøder tab
3. `src/features/fine-rules/fine-rules.css` — Badge styling

**Actions:**
- Add conditional buttons (member: "Ny bøde forslag", admin: "+ Ny bøde" + "Nye bøde forslag {X}")
- Implement Firestore listener for real-time badge updates
- Style badge and buttons per design system

**Acceptance:**
- Badge shows pending count
- Badge disabled/hidden when 0
- Real-time updates without refresh

### Phase 6: Notifications (TBD)

Defer to notification feature spec (F0XX-notifications.md when available).

## Technical Decisions

### Data Mutations
- Proposals are **hard-deleted** (not soft-deleted) after approval/denial to keep the proposals collection clean
- FineRules follow existing soft-delete pattern
- ActivityLog entries are immutable (audit trail)

### Real-Time Updates
- Use Firestore listeners (`onSnapshot`) for:
  - Badge count on Bøder tab
  - Proposal list updates (member's own, admin's all)
  - FineRule list updates after approval

### Validation
- Reuse existing `validateFineRule()` logic from fine-rules feature
- Apply same DKK amount validation (must be > 0)
- Emoji validation (if any)

### Security
- Firestore rules: Members can only create/edit/delete their own (proposedBy === request.auth.uid)
- Admins bypass this for viewing all
- Server-side validation on approval/denial operations

## Risk & Mitigations

| Risk | Mitigation |
|------|-----------|
| Duplicate proposals | Accept; admins manage manually. Consider de-duplication in future. |
| Proposal cascade delete if proposer leaves team | Proposal persists for audit (see edge case in spec). |
| Real-time listener lag | Acceptable for MVP; revisit if performance issues arise. |
| Notifications not implemented | Defer; start without them, add in F0XX-notifications. |
| Member edits while admin reviews | Okay; admin refreshes to see latest. Document in UX. |

## Testing Strategy

- **Unit tests**: FineRuleProposal validation, permission checks
- **Integration tests**: Proposal creation → approval → FineRule creation
- **E2E (manual)**: 
  1. Member submits proposal → confirms on MyProposals
  2. Admin reviews → approves → appears in FineRule catalogue
  3. Badge updates in real-time
  4. Member cannot edit/retract after approval

## Acceptance Criteria Mapping

| Acceptance Criterion | Implemented By | Phase |
|----------------------|----------------|-------|
| Member sees "Ny bøde forslag" button | Button conditional logic | Phase 5 |
| Proposal form saves | ProposalForm + useProposalSubmit | Phase 2 |
| Confirmation message | Toast notification | Phase 2 |
| Member views own proposals | MyProposals component | Phase 3 |
| Member edits pending proposals | ProposalDetail + useProposalEdit | Phase 3 |
| Member retracts proposals | useProposalEdit (delete path) | Phase 3 |
| Admin sees button with count | AdminProposalList + badge | Phase 5 |
| Admin approves | AdminProposalDetail + useProposalApproval | Phase 4 |
| Admin denies | AdminProposalDetail + useProposalApproval | Phase 4 |
| ActivityLog entries created | useProposalSubmit + useProposalApproval | Phases 2–4 |
| Badge updates real-time | Firestore listener | Phase 5 |
| Notifications sent | TBD (Phase 6) | Phase 6 |
| Proposal scoped to team | Firestore rules + collection structure | Phase 1 |

## Success Metrics

- All acceptance criteria are met
- Zero TypeScript errors (`npx tsc --noEmit`)
- E2E manual tests pass on mobile (430px) and desktop
- Code follows vertical-slice architecture (all files in `src/features/fine-rules/`)
- ActivityLog entries recorded for all mutations
- Real-time badge updates without requiring page refresh
