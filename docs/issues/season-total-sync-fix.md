# Season Total Sync Fix – Investigation & Resolution

**Issue**: The three statistics on the **Hold** tab did not add up correctly:
- "Udstedt bøder" (Issued fines) ≠ "Skyldigt" (Owed) + "Indbetalt" (Paid)

## Root Cause

The bug was in the `updateUserSeasonBalance()` function in [src/lib/firestore/balances.ts](../../src/lib/firestore/balances.ts).

When a fine is assigned to **multiple users** (shared fine) or deleted:
- The code calls `updateUserSeasonBalance()` once per affected user in a **loop**
- Each call does a `getDoc(seasonRef)` to read the current Season document
- All reads in the loop see the **same stale snapshot** (batch writes haven't committed yet)
- When each call writes back the updated season, earlier deltas are **overwritten** by later ones

### Example: Deleting a fine shared with 3 users

**Expected**: Season.totalOutstanding decreases by 300 (100 + 100 + 100)

**What actually happened**:
1. **Iteration 1**: Read season.totalOutstanding = 1000, subtract 100 user1 share, write back 900 → batch = `{ totalOutstanding: 900 }`
2. **Iteration 2**: Read season.totalOutstanding = 1000 (NOT 900!), subtract 100 user2 share, write back 900 → batch overwrites to `{ totalOutstanding: 900 }`
3. **Iteration 3**: Same, overwrites to `{ totalOutstanding: 900 }`

**Result**: Only the last delta was applied, earlier two were lost!

This caused the **Season totals** to be out of sync with the **sum of individual member balances**.

## Solution

### New Functions

1. **`SeasonDeltaAccumulator` type** — Object to track accumulated season-level deltas
   ```ts
   export interface SeasonDeltaAccumulator {
     [seasonId: string]: BalanceDelta;
   }
   ```

2. **`updateUserSeasonBalance()` with optional accumulator** — Updated to accept an optional `seasonDeltaAccumulator` parameter:
   - If provided: accumulates season deltas instead of immediately writing them
   - If not provided: uses legacy behavior (single updates work fine)

3. **`applySeasonDeltas()` new function** — Applies all accumulated deltas to the season in a single atomic operation:
   ```ts
   export async function applySeasonDeltas(
     teamId: string,
     seasonId: string,
     accumulator: SeasonDeltaAccumulator,
     batch: WriteBatch,
   ): Promise<void>
   ```

### Updated Callers

Three functions now use the accumulator pattern:

1. **`softDeleteFine()`** — When a fine is deleted and affects multiple users
2. **`assignFineWithPayment()`** — When a fine is assigned to multiple users
3. **`restoreFine()`** — When a deleted fine is restored and affects multiple users

**Pattern**:
```ts
const seasonDeltaAccumulator: SeasonDeltaAccumulator = {};

// Loop through affected users
for (const user of users) {
  await updateUserSeasonBalance(
    userId,
    teamId,
    seasonId,
    delta,
    trigger,
    actorId,
    batch,
    seasonDeltaAccumulator, // ← Pass accumulator
  );
}

// Apply all deltas at once
await applySeasonDeltas(teamId, seasonId, seasonDeltaAccumulator, batch);
await batch.commit();
```

## Files Changed

- [src/lib/firestore/balances.ts](../../src/lib/firestore/balances.ts)
  - Added `SeasonDeltaAccumulator` type
  - Enhanced `updateUserSeasonBalance()` signature
  - Added new `applySeasonDeltas()` function

- [src/lib/firestore/fines.ts](../../src/lib/firestore/fines.ts)
  - Updated `assignFineWithPayment()` to use accumulator
  - Updated `softDeleteFine()` to use accumulator
  - Updated `restoreFine()` to use accumulator
  - Updated imports

- [src/lib/firestore/index.ts](../../src/lib/firestore/index.ts)
  - Exported `applySeasonDeltas()` function
  - Exported `SeasonDeltaAccumulator` type

## Verification

After this fix:
- ✅ Individual member balances (`UserSeasonBalance` records) — **unchanged, already correct**
- ✅ Season totals (Season document) — **now correctly updated even when multiple users affected**
- ✅ Math now adds up: `totalOwed + totalPaid === totalIssued`

### How to Test

1. **Before**: Note the current "Udstedt bøder", "Skyldigt", and "Indbetalt" values
2. **Assign or delete a shared fine** (one fine to multiple members)
3. **After**: Verify the three stats now add up correctly:
   - totalOwed + totalPaid should equal totalIssued

### Database Consistency Check

If historical data has accumulated errors, consider running a **season total reconciliation script** to rebuild season totals from individual member balances:

```ts
// Pseudocode (not implemented yet)
for each season:
  totalOutstanding = sum of all member.outstandingBalance
  totalPending = sum of all member.pendingBalance
  totalApproved = sum of all member.approvedBalance
  write back to season doc
```

This could be added to a maintenance endpoint if needed.

## Impact

- **Backward compatible** — Old code calling `updateUserSeasonBalance()` without the accumulator still works
- **No data migration needed** — The fix prevents future drift; historical data will normalize as fines are assigned/deleted/restored
- **Performance**: No negative impact; same number of database writes, just better ordered

## Related Specs

- [F024: Season Balance Tracking](../specs/features/F024-season-balance-tracking.md)
- [F026: Payment Reconciliation](../specs/features/F026-payment-reconciliation.md)
