import { writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { getSeasonBalances } from "./balances";
import { getSeason } from "./seasons";
import { seasonDoc } from "./refs";
import type { Season } from "../../types/domain";

/**
 * Reconciliation result for a single season
 */
export interface ReconciliationResult {
  seasonId: string;
  seasonName: string;
  before: {
    totalOutstanding: number;
    totalPendingBalance: number;
    totalApprovedBalance: number;
  };
  after: {
    totalOutstanding: number;
    totalPendingBalance: number;
    totalApprovedBalance: number;
  };
  changes: {
    outstandingDelta: number;
    pendingDelta: number;
    approvedDelta: number;
  };
  healed: boolean;
}

/**
 * Reconciles a single season by rebuilding its totals from individual member balances.
 * This fixes data corruption from the stale-read bug.
 * 
 * Returns the changes made.
 */
export async function reconcileSeasonTotals(
  teamId: string,
  seasonId: string,
): Promise<ReconciliationResult> {
  // Fetch the season and all member balances
  const [season, balances] = await Promise.all([
    getSeason(teamId, seasonId),
    getSeasonBalances(teamId, seasonId),
  ]);

  if (!season) {
    throw new Error(`Season ${seasonId} not found in team ${teamId}`);
  }

  // Calculate correct totals from member balances
  let correctOutstanding = 0;
  let correctPending = 0;
  let correctApproved = 0;

  for (const balance of balances) {
    correctOutstanding += balance.outstandingBalance;
    correctPending += balance.pendingBalance;
    correctApproved += balance.approvedBalance;
  }

  const before = {
    totalOutstanding: season.totalOutstanding ?? 0,
    totalPendingBalance: season.totalPendingBalance ?? 0,
    totalApprovedBalance: season.totalApprovedBalance ?? 0,
  };

  const after = {
    totalOutstanding: correctOutstanding,
    totalPendingBalance: correctPending,
    totalApprovedBalance: correctApproved,
  };

  const changes = {
    outstandingDelta: correctOutstanding - (season.totalOutstanding ?? 0),
    pendingDelta: correctPending - (season.totalPendingBalance ?? 0),
    approvedDelta: correctApproved - (season.totalApprovedBalance ?? 0),
  };

  const healed =
    changes.outstandingDelta !== 0 ||
    changes.pendingDelta !== 0 ||
    changes.approvedDelta !== 0;

  // If changes needed, write the corrected season
  if (healed) {
    const batch = writeBatch(db);
    const seasonRef = seasonDoc(teamId, seasonId);
    const updated: Season = {
      ...season,
      totalOutstanding: correctOutstanding,
      totalPendingBalance: correctPending,
      totalApprovedBalance: correctApproved,
    };
    batch.set(seasonRef, updated);
    await batch.commit();
  }

  return {
    seasonId,
    seasonName: season.name,
    before,
    after,
    changes,
    healed,
  };
}

/**
 * Reconciles all seasons for a team.
 * Returns results for each season.
 */
export async function reconcileAllSeasons(
  teamId: string,
): Promise<ReconciliationResult[]> {
  // Fetch all seasons for the team
  const { getSeasons } = await import("./seasons");
  const seasons = await getSeasons(teamId);

  const results: ReconciliationResult[] = [];

  for (const season of seasons) {
    try {
      const result = await reconcileSeasonTotals(teamId, season.id);
      results.push(result);
    } catch (error) {
      console.error(`Failed to reconcile season ${season.id}:`, error);
    }
  }

  return results;
}
