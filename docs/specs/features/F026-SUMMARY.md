# F026 — Member Fine Rule Proposals — Ready for Implementation

## Summary

F026 enables team members to propose new fine rules to the catalogue. Admins review each proposal and approve (adding it to the active catalogue) or deny (removing it permanently). This shifts fine rule management from admin-only to community-driven with admin validation.

## Documentation

| Document | Purpose | Status |
|----------|---------|--------|
| [F026-member-fine-rule-proposal.md](./F026-member-fine-rule-proposal.md) | Feature specification | ✅ Complete |
| [F026-PLAN.md](./F026-PLAN.md) | Implementation strategy & phasing | ✅ Complete |
| [F026-TASKS.md](./F026-TASKS.md) | Actionable task breakdown | ✅ Complete |

## Key Points

### What This Feature Does

**User Journey (Member):**
1. Member navigates to Bøder tab
2. Member taps "Ny bøde forslag" (instead of "+ Ny bøde")
3. Member fills form: title, description, amount, emoji
4. System saves proposal with status=pending
5. Member can edit/retract if pending; read-only if approved/denied

**User Journey (Admin):**
1. Admin navigates to Bøder tab
2. Admin sees "+ Ny bøde" button (for direct creation) + "Nye bøde forslag {X}" button
3. Admin taps "Nye bøde forslag {X}" button
4. Admin reviews list of pending proposals
5. Admin approves (creates FineRule) or denies (deletes proposal)
6. Badge updates in real-time

### Data Model

**New Type**: `FineRuleProposal`
```ts
interface FineRuleProposal {
  id: string;
  teamId: string;
  proposedBy: string;           // User ID
  proposedByName: string;        // Snapshot
  title: string;
  description?: string;
  amount: number;
  emoji?: string;
  status: "pending" | "approved" | "denied";
  seasonId: string;
  createdAt: string;
  approvedAt?: string;
  deniedAt?: string;
}
```

**ActivityLog Actions**:
- `rule.proposal_created` — member submits
- `rule.proposal_approved` — admin approves
- `rule.proposal_denied` — admin rejects

### Permissions

| Action | Member | Admin |
|--------|--------|-------|
| Create proposal | ✓ | ✓ |
| Edit own pending proposal | ✓ | — |
| Retract own pending proposal | ✓ | — |
| View own proposals | ✓ | — |
| View all pending proposals | — | ✓ |
| Approve proposal | — | ✓ |
| Deny proposal | — | ✓ |

### File Structure

All files go in `src/features/fine-rules/`:

```
src/features/fine-rules/
  FineCatalog.tsx                    # (update) Main page, button routing
  FineRuleForm.tsx                   # (existing) Reused for admin creation
  ProposalForm.tsx                   # (new) Member submission
  MyProposals.tsx                    # (new) List of own proposals
  ProposalDetail.tsx                 # (new) View/edit/retract
  AdminProposalList.tsx              # (new) Admin review list
  AdminProposalDetail.tsx            # (new) Approve/deny
  useProposalSubmit.ts               # (new) Submission logic
  useProposalEdit.ts                 # (new) Edit/retract logic
  useProposalApproval.ts             # (new) Approve/deny logic
  fine-rules.css                     # (update) Badge styling
```

### Implementation Phases

1. **Phase 1** — Data model & types (FineRuleProposal, permissions)
2. **Phase 2** — Member proposal submission (ProposalForm, submit hook, confirmation)
3. **Phase 3** — Member proposal management (MyProposals, ProposalDetail, edit hook)
4. **Phase 4** — Admin review & approval (AdminProposalList, AdminProposalDetail, approval hook)
5. **Phase 5** — UI integration & real-time (Button routing, badge, real-time listeners)
6. **Phase 6** — Notifications (Deferred until notification spec is ready)

### Acceptance Criteria (17 items)

All criteria from the spec are verifiable and testable:
- Member UI: button, form, confirmation, MyProposals list, edit/retract
- Admin UI: button with badge, proposal list, approve/deny, real-time updates
- Data: Firestore scoping, ActivityLog entries, status transitions
- Behavior: Permission checks, validation, error handling

See [F026-TASKS.md](./F026-TASKS.md) for full verification checklist.

### Success Metrics

✅ All 17 acceptance criteria verified  
✅ Zero TypeScript errors  
✅ Mobile-first design (430px target)  
✅ Real-time updates via Firestore listeners  
✅ ActivityLog entries for all mutations  
✅ Team-scoped data isolation  
✅ E2E manual testing on mobile and desktop  

### Dependencies

- ✅ `FineRule` and `FineRuleForm` already exist (reuse validation)
- ✅ `ActivityLog` infrastructure exists
- ✅ Firebase/Firestore integration exists
- ⏳ Notification feature (F0XX-notifications.md) — Phase 6 depends on this

### Known Test Account

- Email: `copilot.test.20260519.1@example.com` (can act as member or admin depending on team role)
- Passwords: Handled securely (not stored in repo)

---

## Next Steps

1. **Implementation can start with Phase 1** (add types and permissions)
2. **Follow task breakdown in [F026-TASKS.md](./F026-TASKS.md)** in order
3. **Verify each task's acceptance criteria** as you go
4. **Run `npx tsc --noEmit`** after each phase to ensure zero errors
5. **Manual E2E testing** on mobile (430px) before final sign-off
6. **Update version and PATCH_NOTES.md** when ready to ship

---

## Architecture Notes

- **Vertical-slice**: All code in `src/features/fine-rules/` (no cross-feature imports)
- **Styling**: Feature CSS co-located (`fine-rules.css`), uses Tailwind v4
- **Permissions**: Use helpers from `src/lib/permissions.ts`, never hardcode roles
- **Real-time**: Firestore `onSnapshot` listeners for badge and list updates
- **TypeScript**: All functions typed, strict null checks enabled
- **Danish copy**: UI text in Danish (Bøde, forslag, godkend, afvis, etc.)
- **ActivityLog**: Every mutation creates an entry (proposal creation, approval, denial)

---

## Questions for Team

1. **Notifications** — Should Phase 6 (admin notifications) be part of this task, or deferred to a separate feature when notification infrastructure is ready?
2. **Proposal history** — Should approved proposals be soft-deleted from Firestore for audit trail, or hard-deleted? (Spec says hard-delete; clarify if needed.)
3. **Member see proposals** — Should members only see their own pending, or also approved/denied? (Spec says they can see theirs after decision; okay to show in list?)
4. **Badge visibility** — Should members see the pending proposal count badge, or only admins? (Spec suggests admin-only.)
5. **Deduplication** — Edge case in spec allows duplicate proposals. Should we add a future enhancement to flag similar proposals to admin?

---

**Spec Status**: ✅ Ready for Implementation  
**Documentation**: ✅ Complete  
**Data Model**: ✅ Defined  
**Tasks**: ✅ Broken down  

**Start with Phase 1 of [F026-TASKS.md](./F026-TASKS.md) — Task 1.1: Add FineRuleProposal Type**
