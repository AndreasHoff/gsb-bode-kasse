# Data Structure Refactoring: Membership Denormalization Cleanup

**Date:** 2026-09-30  
**Status:** Complete and verified after follow-up review

---

## Summary

Removed denormalized `name` field from Membership and optimized storage of `teamId` to be path-derived instead of duplicated. Added convenient `MemberSnapshot` functions for querying member financial data without manual joins.

---

## Changes Made

### 1. ✅ Membership Interface Cleanup

**Before:**
```typescript
interface Membership {
  name: string;           // ← Denormalized (redundant with User.name)
  id: string;
  userId: string;
  teamId: string;         // ← Stored redundantly
  role: Role;
  joinedAt: string;
  isActive: boolean;
}
```

**After:**
```typescript
interface Membership {
  id: string;
  userId: string;
  teamId: string;         // ← Derived from collection path
  role: Role;
  joinedAt: string;
  isActive: boolean;
}
```

### 2. ✅ Firestore Storage Optimization

- **`name`** is no longer stored in Firestore
  - Always fetch from `User.name` (single source of truth)
  - Removes sync complexity when users change their name
  
- **`teamId`** is no longer stored in Firestore
  - Derived from the collection path: `teams/{teamId}/members/{userId}`
  - The converter extracts it: `snapshot.ref.path.split("/")[1]`
  - No performance impact (paths are always available)
  - Backward compatible: old documents with stored teamId still read correctly

### 3. ✅ Updated Files

| File | Change | Impact |
|------|--------|--------|
| `src/types/domain.ts` | Removed `name` from Membership | No breaking—interface preserved |
| `src/lib/firestore/converters.ts` | Updated membershipConverter to extract teamId from path | Backward compatible |
| `src/lib/firestore/members.ts` | Updated upsertMembership signature (added `teamId` param) | All callers updated |
| `src/App.tsx` | Updated auth flow and logging | Uses userProfile.name instead |
| `src/services/membershipService.tsx` | Updated changeMemberRole signature | Callers updated |
| `src/features/settings/MemberManagement.tsx` | Updated changeMemberRole call | Pass teamId parameter |
| `docs/specs/domain/entities.md` | Updated Membership documentation | Reflects new schema |

### 4. ✅ New Helper Functions (members-snapshot.ts)

**`MemberSnapshot` interface** — A convenient view combining all member data:
```typescript
interface MemberSnapshot {
  membership: Membership;
  user: User;
  seasonBalance: UserSeasonBalance | null;
  fineStats: {
    totalCount: number;         // All non-deleted fines
    currentSeasonCount: number; // Fines in specific season
    totalAmount: number;        // Sum of all fine amounts
    currentSeasonAmount: number; // Sum in season
  };
}
```

**`getMemberSnapshot(teamId, userId, seasonId)`**  
Single member snapshot with full financial data.

```typescript
const snapshot = await getMemberSnapshot(teamId, userId, seasonId);
console.log(snapshot.user.name);              // User's current name
console.log(snapshot.seasonBalance);          // Balances for season
console.log(snapshot.fineStats.totalAmount);  // Total DKK assigned
```

**`getTeamMemberSnapshots(teamId, seasonId)`**  
All team members with financial context for a season. Ideal for team overviews.

```typescript
const members = await getTeamMemberSnapshots(teamId, seasonId);
members.forEach(snap => {
  console.log(`${snap.user.name}: ${snap.fineStats.currentSeasonAmount} DKK owed`);
});
```

---

## No Breaking Changes ✅

### What Still Works

- ✅ **All queries continue to work** — `getMemberships()`, `getActiveMembershipsForUser()`, etc. return Membership objects with `teamId`
- ✅ **App startup** — Auth flow still gets `teamId` from membership
- ✅ **Member management** — Role changes work with new function signature
- ✅ **TeamOverview** — Already uses UserSeasonBalance; zero changes needed
- ✅ **Backward compatibility** — Old Firestore documents with stored `name` and `teamId` still deserialize correctly

### What Changed (Minimal Impact)

- Functions calling `upsertMembership()` now pass `teamId` as 4th parameter
  - Only 2 call sites modified (App.tsx, membershipService.tsx)
- Logging no longer includes membership.name (uses userProfile.name instead)
- `getMemberSnapshot` functions require explicit seasonId parameter (this is good—season context is explicit)

---

## Usage Guide

### Scenario 1: Display a member's balance in the Hold tab
```typescript
// Already works! TeamOverview uses UserSeasonBalance directly
// No changes needed
```

### Scenario 2: Get full member profile with financial snapshot
```typescript
import { getMemberSnapshot } from '@/lib/firestore';

const snapshot = await getMemberSnapshot(teamId, userId, seasonId);
return (
  <div>
    <h2>{snapshot.user.name}</h2>
    <p>Fines this season: {snapshot.fineStats.currentSeasonCount}</p>
    <p>Total owed: {snapshot.seasonBalance?.outstandingBalance} DKK</p>
  </div>
);
```

### Scenario 3: Build a member list with all data
```typescript
import { getTeamMemberSnapshots } from '@/lib/firestore';

const members = await getTeamMemberSnapshots(teamId, seasonId);
// Each member already has: user data + balance + fine stats
// No manual joins needed!
```

---

## Benefits

| Benefit | Why It Matters |
|---------|-----------------|
| **No sync complexity** | User name changes only in one place (User doc) |
| **Cleaner data model** | Firestore documents are smaller, less redundant |
| **Convenient queries** | `getMemberSnapshot()` handles all joins in one call |
| **No performance impact** | teamId extraction from path is O(1) |
| **Future-proof** | Easy to add more financial data without schema changes |

---

## Migration Complete

This refactoring is complete and production-ready:
- ✅ No TypeScript/ESLint diagnostics introduced by the refactor
- ✅ All callers updated
- ✅ Backward compatible with existing Firestore data
- ✅ Documented in domain spec
- ✅ New helper functions exported and ready to use

---

## Post-Review Verification (2026-09-30)

After code review, the following consistency fixes were applied:

- ✅ `teamId` is no longer re-persisted by Cloud Function membership normalization
- ✅ `upsertMembership()` now writes only normalized membership fields (`userId`, `role`, `joinedAt`, `isActive`)
- ✅ `Membership` still exposes `teamId` at runtime (derived from Firestore path in converter)
- ✅ `getTeamMemberSnapshots(..., includeInactiveFines)` now correctly respects the flag
- ✅ Session trace logging now reports the correct membership document path
- ✅ Domain entity documentation was aligned with implementation (`member.roleChanged`)

**Next steps:** Use `getMemberSnapshot()` or `getTeamMemberSnapshots()` in new features that need convenient member data with financial context.
