# PR #26 Review — Hold Redesign (summary + F014/F018 suggestions)

Summary
- PR #26 implements the Hold (TeamOverview) redesign: Bødekasse Saldo header, 3 stat cards, role-aware two-column member list, color-coded paid/outstanding states. This resolves Issue #25's core ask.
- I checked the branch locally, started the dev server and captured a mobile (430×800) screenshot: `screenshots/team-overview-demo.png`.

Review checklist (high priority)
- [ ] Data correctness
  - Confirm aggregations are scoped to the active season (only payments for fines whose `seasonId === activeSeason.id` are counted). (Code: `TeamOverview.tsx` uses `seasonFineIds` which is correct.)
  - Confirm `totalIssued`, `totalOwed`, `totalPaid` formulas align with product expectations (issued should be sum of payment.amount for season fines; owed should count unpaid/pending/disputed; paid should count `approved`).
- [ ] Permissioning
  - Ensure role resolution respects `user.isSuperAdmin` and membership `role` (PR appears to do this).
  - Any admin-only UI (pending approvals banner, approve/dispute controls) must be gated via `canApprovePayments(userRole, isSuperAdmin)` from `src/lib/permissions.ts`.
- [ ] Performance
  - Ensure reads are batched where possible and the UI re-uses cached lists (current data flow Promise.all([getActiveSeason, getUsers, getMemberships]) then getFines/getPayments is reasonable).
- [ ] Theming & tokens
  - Confirm no hard-coded theme colors remain (use `var(--color-*)` tokens). Replace any `amber-*` or raw hex with tokens. (We already added `--color-warning-*` tokens earlier.)
- [ ] Accessibility & layout
  - Mobile-first: verify layout at 430px (screenshot captured).
  - Contrast: ensure `team-member-saldo--owed` (accent) meets contrast requirements.
  - Interactive elements (member rows) should have focus styles and accessible names.
- [ ] Visual evidence & tests
  - Add Playwright screenshots at 430px for the Hold view and any admin approval screen (required by constitution).
  - Add unit/integration tests for approve/dispute flows.

F018 (TeamOverview) — Suggested polish (podium, pill badges, admin banner)

Goal: keep PR #26 changes but add small, non-invasive UX features requested in F018.

1) Pass permission props from `App.tsx` to `TeamOverview` (so component can show admin banner).

Suggested change (App.tsx):

```diff
- <TeamOverview
-   teamId={teamId}
-   onMemberSelect={(memberId, memberName) => { ... }}
- />
+ <TeamOverview
+   teamId={teamId}
+   userRole={userRole}
+   isSuperAdmin={isSuperAdmin}
+   onOpenAdminApprovals={() => setActiveTab('activity') /* or custom admin tab */}
+   onMemberSelect={(memberId, memberName) => { ... }}
+ />
```

2) Add admin pending-payments banner (UI snippet for `TeamOverview.tsx`)

```tsx
// after totals are computed (inside render)
{(userRole === 'admin' || isSuperAdmin) && pendingCount > 0 && (
  <div className="team-admin-banner">
    <p>Der er <strong>{pendingCount}</strong> afventende indbetalinger.</p>
    <button className="btn-primary" onClick={onOpenAdminApprovals}>Gå til godkendelser</button>
  </div>
)}
```

Note: compute `pendingCount` while iterating payments (increment when `payment.status === 'pending'`).

3) Podium (top-3) visual

Suggested markup (insert between header card and team-stats):

```tsx
const top3 = sortedMembers.slice(0, 3);
{top3.length > 0 && (
  <div className="podium">
    {top3.map((item, idx) => (
      <div key={item.user.id} className={`podium-slot podium-slot--rank-${idx+1}`}>
        <div className="podium-rank">{idx + 1}</div>
        <div className="podium-name">{item.user.name}</div>
        <div className="podium-amount">{formatAmount(item.totalDebt)}</div>
      </div>
    ))}
  </div>
)}
```

Suggested CSS additions (add to `src/features/overview/team-overview.css`):

```css
.podium { display:flex; gap:0.6rem; margin-bottom:0.9rem; }
.podium-slot { flex:1; padding:0.6rem; border-radius:0.75rem; background:var(--color-surface-muted); text-align:center; }
.podium-slot--rank-1 { border: 2px solid color-mix(in srgb, var(--color-primary) 70%, transparent); }
.podium-slot--rank-2 { border: 1.5px solid color-mix(in srgb, var(--color-accent) 60%, transparent); }
.podium-slot--rank-3 { border: 1px solid var(--color-border); }
.podium-rank { font-weight:800; font-size:1.1rem; }
```

4) Pill badges for `pending` / `disputed`

Compute per-member flags while iterating `payments` (set `hasPending`, `hasDisputed` on the accumulators). Then render near the name:

```tsx
{item.hasPending && <span className="badge badge--pending">Afventer</span>}
{item.hasDisputed && <span className="badge badge--disputed">Anket</span>}
```

Suggested badge CSS:

```css
.badge { display:inline-block; padding:0.12rem 0.45rem; border-radius:999px; font-size:0.6rem; font-weight:700; margin-left:0.4rem; }
.badge--pending { background:var(--color-warning-bg); color:var(--color-warning-text); border:1px solid var(--color-warning-border); }
.badge--disputed { background:color-mix(in srgb, var(--color-accent) 12%, var(--color-surface-muted)); color:var(--color-accent); border:1px solid color-mix(in srgb, var(--color-accent) 55%, transparent); }
```

5) Chevron / tap affordance

Add a small chevron on the right of `.team-member-row` (or use existing right column) to indicate tap. Keep the row as a button for accessibility.


F014 (Admin Payment Approval) — suggested implementation plan & skeleton

Goal: add an admin screen where pending payments can be reviewed and either `Approve` or `Dispute`.

1) New component: `src/features/payments/AdminApproval.tsx` (skeleton)

```tsx
import { useEffect, useState } from 'react';
import { getPendingPaymentsForTeam, approvePayment, disputePayment } from '../../lib/firestore';

export default function AdminApproval({ teamId, actorId }) {
  const [items, setItems] = useState([]);
  useEffect(() => { /* load pending payments for active season */ }, [teamId]);

  async function handleApprove(paymentId: string) {
    await approvePayment(teamId, paymentId, actorId);
    // update UI + log activity
  }

  async function handleDispute(paymentId: string) {
    await disputePayment(teamId, paymentId, actorId);
    // update UI + log activity
  }

  return (
    <div className="app-page">
      <h1 className="app-title">Godkend indbetalinger</h1>
      {/* list with Approve + Dispute actions */}
    </div>
  );
}
```

2) Firestore helpers (lib/firestore.ts)

```ts
export async function approvePayment(teamId: string, paymentId: string, approverId: string) {
  // set payment.status = 'approved', approvedAt, approvedBy
  // add activity log entry
}

export async function disputePayment(teamId: string, paymentId: string, approverId: string) {
  // set payment.status = 'disputed', add metadata
  // add activity log entry
}
```

3) Firestore rules: ensure only `admin` or `isSuperAdmin` may write status changes to `payments/*`.

4) Tests: add an integration test that creates a pending payment, runs `approvePayment`, asserts the status and ActivityLog entry.


Merge & release checklist (post merge)
- [ ] Run `npx tsc --noEmit` and fix any type issues.
- [ ] Run Playwright (430px) screenshots for Hold view and AdminApproval view.
- [ ] Add tests for approval flow.
- [ ] Bump `package.json` version and add entry in `docs/PATCH_NOTES.md`.
- [ ] `git pull origin main`, resolve conflicts (if any), commit and push.


Notes & artifacts
- Screenshot captured locally: `screenshots/team-overview-demo.png` (430×800 mobile).
- Local branch used for review: `pr-26` (I created a small local demo-mode helper — safe for review only; it can be removed before merging.)


If you want, I can now:
- Option 1: open a small PR branch implementing these F018 polish items (podium + badges + admin banner), or
- Option 2: produce a small patch file / PR comment snippets to post on GitHub for PR #26 reviewers.

-- End of review doc
