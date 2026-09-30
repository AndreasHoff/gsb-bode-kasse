/**
 * Member snapshot helpers for convenient querying with financial data.
 * These functions join membership, user, and season balance data.
 */

import type { Membership, User, UserSeasonBalance } from "../../types/domain";
import { getMembership, getMemberships } from "./members";
import { getUsers } from "./users";
import { getUserSeasonBalance, getSeasonBalances } from "./balances";
import { getFinesForUser, getFines } from "./fines";

/**
 * A convenient view of a member with their full financial data for a season.
 */
export interface MemberSnapshot {
  membership: Membership;
  user: User;
  seasonBalance: UserSeasonBalance | null;
  fineStats: {
    totalCount: number;         // All non-deleted fines assigned in any season
    currentSeasonCount: number; // Fines in this season only
    totalAmount: number;        // Sum of all fine amounts (any season)
    currentSeasonAmount: number; // Sum of amounts in this season only
  };
}

/**
 * Fetches a single member's snapshot with all their financial data for a specific season.
 * Use this when you need full member context with balances and fine history.
 *
 * @param teamId - The team ID
 * @param userId - The user ID
 * @param seasonId - The season ID (for season-specific data)
 * @returns MemberSnapshot or null if member or user not found
 */
export async function getMemberSnapshot(
  teamId: string,
  userId: string,
  seasonId: string,
): Promise<MemberSnapshot | null> {
  const [membership, user, seasonBalance, userFines] = await Promise.all([
    getMembership(teamId, userId),
    getUsers().then((users) => users.find((u) => u.id === userId)),
    getUserSeasonBalance(userId, teamId, seasonId),
    getFinesForUser(teamId, userId, false), // include active only
  ]);

  if (!membership || !user) {
    return null;
  }

  // Calculate fine stats
  const currentSeasonFines = userFines.filter((f) => f.seasonId === seasonId);
  const totalAmount = userFines.reduce((sum, f) => sum + f.amount, 0);
  const currentSeasonAmount = currentSeasonFines.reduce((sum, f) => sum + f.amount, 0);

  return {
    membership,
    user,
    seasonBalance,
    fineStats: {
      totalCount: userFines.length,
      currentSeasonCount: currentSeasonFines.length,
      totalAmount,
      currentSeasonAmount,
    },
  };
}

/**
 * Fetches all member snapshots for a team in a specific season.
 * Use this for team overviews or member lists with financial context.
 *
 * @param teamId - The team ID
 * @param seasonId - The season ID
 * @param includeInactiveFines - Whether to include soft-deleted fines in stats (default: false)
 * @returns Array of member snapshots
 */
export async function getTeamMemberSnapshots(
  teamId: string,
  seasonId: string,
  includeInactiveFines = false,
): Promise<MemberSnapshot[]> {
  const [memberships, users, seasonBalances, allFines] = await Promise.all([
    getMemberships(teamId),
    getUsers(),
    getSeasonBalances(teamId, seasonId),
    getFines(teamId, includeInactiveFines),
  ]);

  // Build lookup maps
  const userById = new Map(users.map((u) => [u.id, u]));
  const balanceByUserId = new Map(
    seasonBalances.map((b) => [b.userId, b]),
  );

  // Map each membership to a snapshot
  return memberships
    .map((membership) => {
      const user = userById.get(membership.userId);
      if (!user) return null;

      const seasonBalance = balanceByUserId.get(membership.userId) || null;

      // Filter fines for this user
      const userFines = allFines.filter((f) =>
        f.assignedTo.includes(membership.userId),
      );
      const currentSeasonFines = userFines.filter((f) => f.seasonId === seasonId);

      const totalAmount = userFines.reduce((sum, f) => sum + f.amount, 0);
      const currentSeasonAmount = currentSeasonFines.reduce((sum, f) => sum + f.amount, 0);

      return {
        membership,
        user,
        seasonBalance,
        fineStats: {
          totalCount: userFines.length,
          currentSeasonCount: currentSeasonFines.length,
          totalAmount,
          currentSeasonAmount,
        },
      };
    })
    .filter((snapshot): snapshot is MemberSnapshot => snapshot !== null);
}
