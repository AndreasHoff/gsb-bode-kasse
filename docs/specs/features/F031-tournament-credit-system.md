# F031 - Tournament Credit System

## Problem

When a member wins 2 or more tournaments, admins manually assign a "Vinde turnering - de 2 første" fine worth 35 DKK as a credit/refund. However, the system doesn't intelligently handle this credit: if the member already owes fines, the credit should reduce their debt; if they owe nothing, the credit should be "saved" for the next fine assigned to them. Without this automation, admins must manually refund money or remember to apply credits retroactively, creating friction and error-prone workflows.

## Goal

Enable automatic credit application so that when a tournament credit (35 DKK) is awarded to a member, it either immediately reduces their outstanding balance or carries forward as pending credit to be applied to their next fine.

## Actors

- Admin (awards tournaments credits, observes credit actions in activity log)
- System (applies credits atomically, tracks credit state, expires credits at season close)

## Preconditions

- Active season exists for the team
- Member belongs to the team
- Member's `UserSeasonBalance` has been initialized for the season (automatic)

## Flow

### Tournament Credit Award

1. Admin decides a member has won 2+ tournaments
2. Admin calls **Award Tournament Credit** workflow with `teamId`, `userId`, `seasonId`, `actorId` (admin ID)
3. System fetches member's `UserSeasonBalance` for the season
4. **If `outstandingBalance > 0`:**
   - System creates a new Fine with `amount: -35`, `title: "Turnering kredit 🏆"`, `fineRuleId: null` (manual credit), `assignedTo: [userId]`, `assignedBy: actorId`
   - Fine is immediately unpaid (payment created with 0 net due after credit application)
   - System records ActivityLog: `action: "credit.tournament_awarded"`, `metadata: { userId, amount: 35, appliedImmediately: true, resultingBalance: [new balance] }`
5. **If `outstandingBalance = 0`:**
   - System updates `UserSeasonBalance.pendingCredit = 35`
   - System records ActivityLog: `action: "credit.tournament_awarded"`, `metadata: { userId, amount: 35, appliedImmediately: false, carriedForward: true }`

### Automatic Credit Application

1. Admin assigns a regular fine to member (e.g., 50 DKK)
2. System calls **Apply Pending Credit** check before creating the fine
3. **If `UserSeasonBalance.pendingCredit > 0`:**
   - System calculates: `appliedCredit = Math.min(pendingCredit, fineAmount)`
   - System creates fine with `newAmount = Math.max(0, fineAmount - appliedCredit)`
   - System updates `UserSeasonBalance.pendingCredit -= appliedCredit` (carry forward remainder if credit exceeds fine)
   - System records ActivityLog: `action: "credit.applied"`, `metadata: { userId, creditApplied: appliedCredit, originalFineAmount: fineAmount, newFineAmount: newAmount }`
4. **If `pendingCredit = 0`:**
   - System proceeds normally with fine assignment (no credit logic)

### Season Closure

1. Admin closes the active season
2. System iterates through all members with `pendingCredit > 0`
3. For each member:
   - System records the original credit amount (e.g., 35)
   - System resets `UserSeasonBalance.pendingCredit = 0`
   - System records ActivityLog: `action: "credit.expired"`, `metadata: { userId, creditLost: [original amount] }`

## Edge Cases

- **Credit absorbs entire fine:** If member has 35 DKK credit and is assigned a 20 DKK fine, create a Fine with `amount: 0` (still unpaid status for audit trail) and carry forward `pendingCredit: 15` to next fine
- **Credit partially absorbed:** If member has 35 DKK credit and is assigned a 50 DKK fine, create Fine with `amount: 15` and set `pendingCredit: 0`
- **Bulk fine assignment with mixed credit states:** When assigning the same fine to multiple members, process each member's credit independently (some may have credits, others may not)
- **Member removed from season:** If member is deactivated mid-season with pending credit, reset `pendingCredit = 0` and record `credit.expired` in activity log
- **Retroactive credit award:** If credit is awarded after member already has unpaid fines, it must not retroactively modify existing fines—only newly-assigned fines use pending credits
- **Multiple credits (future-proof):** Only one pending credit per member per season allowed; if a second tournament win occurs, it adds to the existing credit (e.g., 35 + 35 = 70)
- **Season transition:** Pending credits do NOT carry across seasons; they expire when season closes

## Acceptance Criteria

- [ ] `UserSeasonBalance` interface adds `pendingCredit?: number` field (defaults to 0)
- [ ] `awardTournamentCredit(teamId, userId, seasonId, actorId)` helper exists and:
  - Fetches user's `UserSeasonBalance` for the season
  - Creates a -35 DKK fine if `outstandingBalance > 0`
  - Sets `pendingCredit: 35` if `outstandingBalance = 0`
  - Writes atomic batch: fine + balance update + activity log
  - Returns success/error status
- [ ] `applyPendingCredit(teamId, userId, seasonId, fineAmount)` helper exists and:
  - Returns `{ appliedCredit: number, newFineAmount: number, remainingCredit: number }`
  - Returns `{ appliedCredit: 0, newFineAmount: fineAmount, remainingCredit: 0 }` if no pending credit
  - Correctly handles credit > fine case (zero fine + carry forward)
- [ ] `assignFineWithPayment()` calls `applyPendingCredit()` before creating fine and adjusts fine amount accordingly
- [ ] `closeSeason()` resets all `pendingCredit` values to 0 and creates `credit.expired` activity logs
- [ ] ActivityLog supports three new actions: `credit.tournament_awarded`, `credit.applied`, `credit.expired`
- [ ] ActivityLog UI displays credit actions in Danish (e.g., "Admin Navn tildelte turnering kredit på 35 kr. til Spiller Navn")
- [ ] Zero-amount fines (after credit absorption) are created and marked unpaid (for audit trail)
- [ ] Firestore batch operations are atomic (all operations commit or all rollback)
- [ ] Bulk fine assignment applies credits independently to each target member
- [ ] Edge case tested: 35 DKK credit applied to 20 DKK fine = 0 DKK fine + 15 DKK carry-forward
- [ ] Member removal from season resets pending credits to 0 and records expiration
- [ ] No retroactive modification of existing fines when credit is awarded
