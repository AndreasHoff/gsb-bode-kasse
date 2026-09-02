# F026 Implementation — Complete Spec & Planning Package

## 📋 Document Index

This folder contains everything needed to implement F026 (Member Fine Rule Proposals):

| Document | Size | Purpose | Read First? |
|----------|------|---------|-------------|
| **[F026-SUMMARY.md](./F026-SUMMARY.md)** | ~3 min | Executive summary, architecture overview, next steps | ✅ YES |
| **[F026-member-fine-rule-proposal.md](./F026-member-fine-rule-proposal.md)** | ~10 min | Feature specification (problem, goal, actors, flow, edge cases, acceptance criteria) | ✅ After summary |
| **[F026-PLAN.md](./F026-PLAN.md)** | ~15 min | Implementation strategy, data model, phasing, technical decisions, risk mitigation | Then read |
| **[F026-TASKS.md](./F026-TASKS.md)** | ~20 min | Detailed task breakdown (13 tasks across 6 phases with acceptance criteria) | ✅ Use for execution |

## 🚀 Getting Started (5-Minute Workflow)

### For Product/Planning Leads

1. Read [F026-SUMMARY.md](./F026-SUMMARY.md) — 3 min
2. Review [F026-member-fine-rule-proposal.md](./F026-member-fine-rule-proposal.md) — 7 min
3. Clarify any questions → See "Questions for Team" section in SUMMARY

### For Implementation Developers

1. Read [F026-SUMMARY.md](./F026-SUMMARY.md) — 3 min (context)
2. Read [F026-member-fine-rule-proposal.md](./F026-member-fine-rule-proposal.md) — 10 min (spec)
3. Read [F026-PLAN.md](./F026-PLAN.md) — 15 min (strategy)
4. Open [F026-TASKS.md](./F026-TASKS.md) in editor — refer to as you implement

### For Code Review / QA

1. [F026-member-fine-rule-proposal.md](./F026-member-fine-rule-proposal.md) → Acceptance Criteria section
2. [F026-TASKS.md](./F026-TASKS.md) → Testing Checklist & Acceptance Criteria Verification
3. Verify against each criterion during review

---

## 📊 Feature Overview

**Feature Name**: Member Fine Rule Proposals  
**Scope**: Community-driven fine rule creation with admin approval  
**Status**: ✅ Spec-complete, Ready for implementation  
**Estimated Effort**: 13–18 hours (6 phases)  
**Priority Dependencies**: None (can start immediately)  

### What This Delivers

- Members can propose new fine rules (currently admin-only)
- Admins review proposals and approve/deny them
- Real-time badge shows pending proposal count
- Full audit trail via ActivityLog
- Mobile-first UI (430px target width)

---

## 🏗️ Architecture Summary

### Data Model

**New Type**: `FineRuleProposal`
- id, teamId, proposedBy, proposedByName, title, description, amount, emoji, status, seasonId, createdAt, approvedAt?, deniedAt?
- Status: `pending` | `approved` | `denied`

**ActivityLog Actions**:
- `rule.proposal_created`
- `rule.proposal_approved`
- `rule.proposal_denied`

### File Structure (All in `src/features/fine-rules/`)

```
Components:
  FineCatalog.tsx                    (update)
  ProposalForm.tsx                   (new)
  MyProposals.tsx                    (new)
  ProposalDetail.tsx                 (new)
  AdminProposalList.tsx              (new)
  AdminProposalDetail.tsx            (new)

Hooks:
  useProposalSubmit.ts               (new)
  useProposalEdit.ts                 (new)
  useProposalApproval.ts             (new)

Styling:
  fine-rules.css                     (update)
```

### Permissions

| Action | Member | Admin |
|--------|:------:|:-----:|
| Create proposal | ✓ | ✓ |
| Edit own pending | ✓ | — |
| View all pending | — | ✓ |
| Approve/deny | — | ✓ |

---

## 🎯 Implementation Phases

| Phase | Task | Duration | Gate |
|-------|------|----------|------|
| 1️⃣ | Add FineRuleProposal type, permissions, domain spec | 2–3 h | `npx tsc --noEmit` |
| 2️⃣ | Member submission: ProposalForm, useProposalSubmit, confirmation | 3–4 h | Form saves, Toast shows, ActivityLog created |
| 3️⃣ | Member management: MyProposals, ProposalDetail, useProposalEdit | 3–4 h | Can view/edit/retract, read-only after approval |
| 4️⃣ | Admin review: AdminProposalList, AdminProposalDetail, useProposalApproval | 3–4 h | Can approve/deny, FineRule created, ActivityLog entries |
| 5️⃣ | UI integration: routing, buttons, badge, real-time listeners | 2–3 h | Badge updates in real-time, buttons conditional |
| 6️⃣ | Notifications (deferred until notification spec ready) | TBD | Depends on F0XX-notifications |

---

## ✅ Acceptance Criteria (17 total)

All criteria are verifiable and testable:

**Member UI** (5)
- Can tap "Ny bøde forslag" button on Bøder tab
- Form has correct fields: title, description, amount, emoji
- Proposal saved with correct metadata
- Can view own proposals list
- Can edit/retract pending proposals

**Admin UI** (5)
- Sees "+ Ny bøde" + "Nye bøde forslag {X}" buttons
- Button disabled when X = 0
- Can view list of all pending proposals with proposer names
- Can approve (creates FineRule, deletes proposal)
- Can deny (deletes proposal)

**Data & Behavior** (7)
- ActivityLog entries for approval & denial with proposer metadata
- Badge shows pending count, updates real-time, disappears at 0
- Proposal read-only after approval/denial
- Data scoped to team
- [Notifications TBD]

See [F026-TASKS.md](./F026-TASKS.md) for full verification matrix.

---

## 🔧 Technical Requirements

### Code Quality Gates
- ✅ TypeScript: `npx tsc --noEmit` = zero errors
- ✅ Mobile-first: All layouts at 430px, no horizontal scroll
- ✅ Vertical-slice: All code in `src/features/fine-rules/`
- ✅ Permissions: Use helpers from `src/lib/permissions.ts`, no hardcoded roles
- ✅ Danish copy: All UI text in Danish (Bøde, forslag, godkend, afvis, etc.)
- ✅ ActivityLog: Every mutation logged (create, approve, deny)

### Dependencies
- ✅ Existing: `FineRule`, `FineRuleForm`, `ActivityLog`, Firestore
- ⏳ Deferred: Notification infrastructure (Phase 6)

### Test Account
- Email: `copilot.test.20260519.1@example.com`
- Role: Can be member or admin per team

---

## 🎨 UI Components Layout

### Member Flow
```
Bøder Tab
  ├─ "Ny bøde forslag" button
  │  └─ ProposalForm
  │     └─ Confirmation → MyProposals
  │
  └─ "Mine forslag" / proposals list
     └─ ProposalDetail (view/edit/retract if pending)
```

### Admin Flow
```
Bøder Tab
  ├─ "+ Ny bøde" button → FineRuleForm (existing)
  │
  └─ "Nye bøde forslag {X}" button [badge]
     └─ AdminProposalList (all pending)
        └─ AdminProposalDetail
           ├─ Godkend → FineRule created
           └─ Afvis → proposal deleted
```

---

## 🔗 Related Documentation

- [constitution.md](../../constitution.md) — Non-negotiable rules & architecture
- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) — Global project guidelines
- [.github/instructions/feature-development.instructions.md](../../.github/instructions/feature-development.instructions.md) — Component structure & styling rules
- [.github/instructions/spec-writing.instructions.md](../../.github/instructions/spec-writing.instructions.md) — Spec format requirements
- [docs/specs/domain/entities.md](../domain/entities.md) — Domain types & ActivityLog actions
- [src/types/domain.ts](../../../src/types/domain.ts) — TypeScript domain interfaces
- [src/lib/permissions.ts](../../../src/lib/permissions.ts) — Permission helpers

---

## ❓ Questions for Team

Before starting implementation, clarify:

1. **Notifications** — Should admins be notified when proposals are submitted? (Spec says yes, but notification feature not yet implemented.)
2. **Proposal history** — Hard-delete proposals after approval/denial, or soft-delete for audit trail?
3. **Member view** — Should members only see their own proposals, or also approved/denied historical records?
4. **Badge visibility** — Should members see the pending count badge, or only admins?
5. **Deduplication** — Should Phase 5 include similarity checking to flag duplicates to admin?

See [F026-SUMMARY.md](./F026-SUMMARY.md#questions-for-team) for full question list.

---

## 📈 Success Criteria

✅ Implementation complete when:
1. All 17 acceptance criteria verified (see [F026-TASKS.md](./F026-TASKS.md#acceptance-criteria-verification))
2. `npx tsc --noEmit` returns zero errors
3. E2E manual testing passes on mobile (430px) and desktop (1024px+)
4. All ActivityLog entries correctly recorded
5. Real-time badge updates without page refresh
6. Version bumped in `package.json`
7. `docs/PATCH_NOTES.md` updated with user-facing description

---

## 🚦 Ready to Start?

1. **Implementer**: Open [F026-TASKS.md](./F026-TASKS.md) → Start with **Task 1.1: Add FineRuleProposal Type**
2. **Reviewer**: Bookmark [F026-member-fine-rule-proposal.md](./F026-member-fine-rule-proposal.md) → Use Acceptance Criteria for sign-off
3. **PM/Lead**: Share [F026-SUMMARY.md](./F026-SUMMARY.md) with team for alignment

---

**Package Created**: 2026-09-02  
**Spec Status**: ✅ Complete  
**Planning Status**: ✅ Complete  
**Ready for Implementation**: ✅ YES

Next: **Start Phase 1** with [Task 1.1](./F026-TASKS.md#task-11-add-fineruleproposal-type)
