import {
  getDocs,
  getDoc,
  doc,
  writeBatch,
  query,
  where,
  type WriteBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  userSeasonBalancesCol,
  userSeasonBalanceDoc,
  seasonDoc,
  activityLogCol,
} from "./refs";
import type { UserSeasonBalance, ActivityLog, Season } from "../../types/domain";

/**
 * Fetches a UserSeasonBalance record by (userId, teamId, seasonId).
 * Returns null if not found.
 */
export async function getUserSeasonBalance(
  userId: string,
  teamId: string,
  seasonId: string,
): Promise<UserSeasonBalance | null> {
  const q = query(
    userSeasonBalancesCol(teamId),
    where("userId", "==", userId),
    where("seasonId", "==", seasonId),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data();
}

/**
 * Fetches or creates a UserSeasonBalance record.
 * If the record doesn't exist, creates it with zero balances.
 */
export async function getOrCreateUserSeasonBalance(
  userId: string,
  teamId: string,
  seasonId: string,
  batch?: WriteBatch,
): Promise<UserSeasonBalance> {
  const existing = await getUserSeasonBalance(userId, teamId, seasonId);
  if (existing) return existing;

  const colRef = userSeasonBalancesCol(teamId);
  const docRef = doc(colRef);
  const newBalance: UserSeasonBalance = {
    id: docRef.id,
    userId,
    teamId,
    seasonId,
    outstandingBalance: 0,
    pendingBalance: 0,
    approvedBalance: 0,
    updatedAt: new Date().toISOString(),
  };

  if (batch) {
    batch.set(docRef, newBalance);
  } else {
    const localBatch = writeBatch(db);
    localBatch.set(docRef, newBalance);
    await localBatch.commit();
  }

  return newBalance;
}

/**
 * Delta type for balance updates
 */
export interface BalanceDelta {
  outstandingBalance?: number;
  pendingBalance?: number;
  approvedBalance?: number;
}

/**
 * Accumulator for season-level balance deltas.
 * Used when multiple balance updates affect the same season to avoid stale reads.
 */
export interface SeasonDeltaAccumulator {
  [seasonId: string]: BalanceDelta;
}

/**
 * Updates a UserSeasonBalance by applying deltas to balance fields.
 * Also updates the corresponding Season balance fields.
 * Writes a balance.updated ActivityLog entry.
 * All operations are performed atomically within the provided batch.
 * 
 * NOTE: When called multiple times in a loop with the same season,
 * use the accumulator parameter to collect season deltas and apply them once
 * at the end via applySeasonDeltas() to avoid stale reads.
 */
export async function updateUserSeasonBalance(
  userId: string,
  teamId: string,
  seasonId: string,
  delta: BalanceDelta,
  trigger: string,
  actorId: string,
  batch: WriteBatch,
  seasonDeltaAccumulator?: SeasonDeltaAccumulator,
): Promise<void> {
  // 1. Get or create user balance record
  const balance = await getOrCreateUserSeasonBalance(userId, teamId, seasonId, batch);

  // 2. Apply deltas to user balance
  const updated: UserSeasonBalance = {
    ...balance,
    outstandingBalance:
      balance.outstandingBalance + (delta.outstandingBalance ?? 0),
    pendingBalance: balance.pendingBalance + (delta.pendingBalance ?? 0),
    approvedBalance: balance.approvedBalance + (delta.approvedBalance ?? 0),
    updatedAt: new Date().toISOString(),
  };

  const balanceRef = userSeasonBalanceDoc(teamId, balance.id);
  batch.set(balanceRef, updated);

  // 3. Accumulate or apply season deltas
  if (seasonDeltaAccumulator) {
    // Accumulate delta for batch application later
    const current = seasonDeltaAccumulator[seasonId] || {};
    seasonDeltaAccumulator[seasonId] = {
      outstandingBalance: (current.outstandingBalance ?? 0) + (delta.outstandingBalance ?? 0),
      pendingBalance: (current.pendingBalance ?? 0) + (delta.pendingBalance ?? 0),
      approvedBalance: (current.approvedBalance ?? 0) + (delta.approvedBalance ?? 0),
    };
  } else {
    // Legacy: apply season update immediately (single update case)
    const seasonRef = seasonDoc(teamId, seasonId);
    const seasonSnap = await getDoc(seasonRef);
    if (seasonSnap.exists()) {
      const season = seasonSnap.data() as Season;
      const updatedSeason: Season = {
        ...season,
        totalOutstanding:
          (season.totalOutstanding ?? 0) + (delta.outstandingBalance ?? 0),
        totalPendingBalance:
          (season.totalPendingBalance ?? 0) + (delta.pendingBalance ?? 0),
        totalApprovedBalance:
          (season.totalApprovedBalance ?? 0) + (delta.approvedBalance ?? 0),
      };
      batch.set(seasonRef, updatedSeason);
    }
  }

  // 4. Write activity log
  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "balance.updated",
    entityType: "userSeasonBalance",
    entityId: balance.id,
    metadata: {
      userId,
      seasonId,
      delta,
      trigger,
    },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);
}

/**
 * Applies accumulated season deltas to a season document in a single atomic operation.
 * This prevents stale reads when multiple UserSeasonBalance updates affect the same season.
 */
export async function applySeasonDeltas(
  teamId: string,
  seasonId: string,
  accumulator: SeasonDeltaAccumulator,
  batch: WriteBatch,
): Promise<void> {
  const delta = accumulator[seasonId];
  if (!delta) return; // No changes for this season

  const seasonRef = seasonDoc(teamId, seasonId);
  const seasonSnap = await getDoc(seasonRef);
  if (seasonSnap.exists()) {
    const season = seasonSnap.data() as Season;
    const updatedSeason: Season = {
      ...season,
      totalOutstanding:
        (season.totalOutstanding ?? 0) + (delta.outstandingBalance ?? 0),
      totalPendingBalance:
        (season.totalPendingBalance ?? 0) + (delta.pendingBalance ?? 0),
      totalApprovedBalance:
        (season.totalApprovedBalance ?? 0) + (delta.approvedBalance ?? 0),
    };
    batch.set(seasonRef, updatedSeason);
  }
}

/**
 * Returns all UserSeasonBalance records for a given season.
 */
export async function getSeasonBalances(
  teamId: string,
  seasonId: string,
): Promise<UserSeasonBalance[]> {
  const q = query(
    userSeasonBalancesCol(teamId),
    where("seasonId", "==", seasonId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Returns all UserSeasonBalance records for a given user across all seasons in a team.
 */
export async function getUserBalances(
  teamId: string,
  userId: string,
): Promise<UserSeasonBalance[]> {
  const q = query(
    userSeasonBalancesCol(teamId),
    where("userId", "==", userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}
