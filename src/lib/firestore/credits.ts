/**
 * Tournament Credit System (F031)
 * Handles automatic credit application and award workflows
 */

import {
  writeBatch,
  doc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  userSeasonBalancesCol,
  userSeasonBalanceDoc,
  finesCol,
  paymentsCol,
  activityLogCol,
} from "./refs";
import type {
  UserSeasonBalance,
  Fine,
  Payment,
  ActivityLog,
} from "../../types/domain";
import {
  getOrCreateUserSeasonBalance,
  updateUserSeasonBalance,
  applySeasonDeltas,
  type SeasonDeltaAccumulator,
} from "./balances";

export const TOURNAMENT_CREDIT_AMOUNT = 35; // DKK

/**
 * Applies pending credit to a fine.
 * Returns the applied credit amount and the new fine amount.
 * Does NOT modify any data — purely computational.
 *
 * @param pendingCredit Current pending credit (DKK)
 * @param fineAmount Amount of fine being assigned (DKK)
 * @returns { appliedCredit, newFineAmount, remainingCredit }
 */
export function calculatePendingCreditApplication(
  pendingCredit: number,
  fineAmount: number,
): {
  appliedCredit: number;
  newFineAmount: number;
  remainingCredit: number;
} {
  if (pendingCredit <= 0) {
    return {
      appliedCredit: 0,
      newFineAmount: fineAmount,
      remainingCredit: 0,
    };
  }

  const appliedCredit = Math.min(pendingCredit, fineAmount);
  const newFineAmount = Math.max(0, fineAmount - appliedCredit);
  const remainingCredit = pendingCredit - appliedCredit;

  return {
    appliedCredit,
    newFineAmount,
    remainingCredit,
  };
}

/**
 * Awards a tournament credit to a member.
 * If member has outstanding balance > 0, creates a -35 DKK fine immediately.
 * If member has no outstanding balance, carries credit forward.
 * Assumes the seasonId provided is for an active season (caller must verify).
 */
export async function awardTournamentCredit(
  teamId: string,
  userId: string,
  seasonId: string,
  actorId: string,
): Promise<{ appliedImmediately: boolean; fineId?: string }> {
  const balance = await getOrCreateUserSeasonBalance(userId, teamId, seasonId);
  const batch = writeBatch(db);
  const seasonDeltaAccumulator: SeasonDeltaAccumulator = {};

  if (balance.outstandingBalance > 0) {
    // Case 1: Create a -35 DKK fine immediately
    const creditFineRef = doc(finesCol(teamId));
    const creditFine: Fine = {
      id: creditFineRef.id,
      teamId,
      seasonId,
      title: "Turnering kredit 🏆",
      amount: -TOURNAMENT_CREDIT_AMOUNT,
      assignedTo: [userId],
      assignedBy: actorId,
      isShared: false,
      createdAt: new Date().toISOString(),
    };
    batch.set(creditFineRef, creditFine);

    // Create unpaid payment for the credit fine
    const creditPaymentRef = doc(paymentsCol(teamId));
    const creditPayment: Payment = {
      id: creditPaymentRef.id,
      fineIds: [creditFine.id],
      userId,
      amount: -TOURNAMENT_CREDIT_AMOUNT,
      status: "unpaid",
    };
    batch.set(creditPaymentRef, creditPayment);

    // Log the fine assignment
    const fineLogRef = doc(activityLogCol(teamId));
    const fineLogEntry: ActivityLog = {
      id: fineLogRef.id,
      teamId,
      actorId,
      action: "fine.assigned",
      entityType: "fine",
      entityId: creditFine.id,
      metadata: {
        title: creditFine.title,
        amount: creditFine.amount,
        assignedTo: [userId],
        seasonId,
        paymentId: creditPayment.id,
      },
      createdAt: new Date().toISOString(),
    };
    batch.set(fineLogRef, fineLogEntry);

    // Log payment creation
    const paymentLogRef = doc(activityLogCol(teamId));
    const paymentLogEntry: ActivityLog = {
      id: paymentLogRef.id,
      teamId,
      actorId,
      action: "payment.created",
      entityType: "payment",
      entityId: creditPayment.id,
      metadata: {
        fineIds: [creditFine.id],
        userId,
        amount: creditPayment.amount,
      },
      createdAt: new Date().toISOString(),
    };
    batch.set(paymentLogRef, paymentLogEntry);

    // Update balance (credit reduces outstanding balance)
    await updateUserSeasonBalance(
      userId,
      teamId,
      seasonId,
      { outstandingBalance: -TOURNAMENT_CREDIT_AMOUNT },
      "credit.tournament_awarded",
      actorId,
      batch,
      seasonDeltaAccumulator,
    );

    // Log credit award
    const creditLogRef = doc(activityLogCol(teamId));
    const creditLogEntry: ActivityLog = {
      id: creditLogRef.id,
      teamId,
      actorId,
      action: "credit.tournament_awarded",
      entityType: "userSeasonBalance",
      entityId: balance.id,
      metadata: {
        userId,
        amount: TOURNAMENT_CREDIT_AMOUNT,
        appliedImmediately: true,
        resultingBalance:
          balance.outstandingBalance - TOURNAMENT_CREDIT_AMOUNT,
      },
      createdAt: new Date().toISOString(),
    };
    batch.set(creditLogRef, creditLogEntry);

    await applySeasonDeltas(teamId, seasonId, seasonDeltaAccumulator, batch);
    await batch.commit();

    return { appliedImmediately: true, fineId: creditFine.id };
  } else {
    // Case 2: Carry credit forward
    const balanceRef = userSeasonBalanceDoc(teamId, balance.id);
    const updated: UserSeasonBalance = {
      ...balance,
      pendingCredit:
        (balance.pendingCredit ?? 0) + TOURNAMENT_CREDIT_AMOUNT,
      updatedAt: new Date().toISOString(),
    };
    batch.set(balanceRef, updated);

    // Log credit award (carried forward)
    const creditLogRef = doc(activityLogCol(teamId));
    const creditLogEntry: ActivityLog = {
      id: creditLogRef.id,
      teamId,
      actorId,
      action: "credit.tournament_awarded",
      entityType: "userSeasonBalance",
      entityId: balance.id,
      metadata: {
        userId,
        amount: TOURNAMENT_CREDIT_AMOUNT,
        appliedImmediately: false,
        carriedForward: true,
      },
      createdAt: new Date().toISOString(),
    };
    batch.set(creditLogRef, creditLogEntry);

    await batch.commit();
    return { appliedImmediately: false };
  }
}

/**
 * Resets all pending credits in a season and logs expiration.
 * Called when a season is closed.
 */
export async function expireSeasonCredits(
  teamId: string,
  seasonId: string,
  actorId: string,
): Promise<void> {
  // Fetch all user season balances for this season
  const q = query(
    userSeasonBalancesCol(teamId),
    where("seasonId", "==", seasonId),
  );
  const snap = await getDocs(q);
  const balances = snap.docs.map((d) => d.data());

  // Filter to only those with pending credit
  const creditsToExpire = balances.filter((b) => (b.pendingCredit ?? 0) > 0);

  if (creditsToExpire.length === 0) return;

  const batch = writeBatch(db);

  for (const balance of creditsToExpire) {
    const creditLost = balance.pendingCredit ?? 0;

    // Reset pending credit
    const balanceRef = userSeasonBalanceDoc(teamId, balance.id);
    const updated: UserSeasonBalance = {
      ...balance,
      pendingCredit: 0,
      updatedAt: new Date().toISOString(),
    };
    batch.set(balanceRef, updated);

    // Log credit expiration
    const logRef = doc(activityLogCol(teamId));
    const logEntry: ActivityLog = {
      id: logRef.id,
      teamId,
      actorId,
      action: "credit.expired",
      entityType: "userSeasonBalance",
      entityId: balance.id,
      metadata: {
        userId: balance.userId,
        creditLost,
      },
      createdAt: new Date().toISOString(),
    };
    batch.set(logRef, logEntry);
  }

  await batch.commit();
}
