import { getDocs, getDoc, doc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { finesCol, fineDoc, activityLogCol, paymentsCol, userSeasonBalanceDoc } from "./refs";
import type { Fine, ActivityLog, Payment } from "../../types/domain";
import { getActiveSeason } from "./seasons";
import { updateUserSeasonBalance, applySeasonDeltas, type SeasonDeltaAccumulator, type BalanceDelta, getOrCreateUserSeasonBalance } from "./balances";
import { calculatePendingCreditApplication } from "./credits";

export async function getFines(
  teamId: string,
  includeDeleted = false,
): Promise<Fine[]> {
  const snap = await getDocs(finesCol(teamId));
  const fines = snap.docs.map((d) => d.data());
  return includeDeleted ? fines : fines.filter((f) => !f.deletedAt);
}

export async function getFinesForUser(
  teamId: string,
  userId: string,
  includeDeleted = false,
): Promise<Fine[]> {
  const q = query(finesCol(teamId), where("assignedTo", "array-contains", userId));
  const snap = await getDocs(q);
  const fines = snap.docs.map((d) => d.data());
  return includeDeleted ? fines : fines.filter((f) => !f.deletedAt);
}

export async function getFine(teamId: string, fineId: string): Promise<Fine | null> {
  const snap = await getDoc(fineDoc(teamId, fineId));
  return snap.exists() ? snap.data() : null;
}

/**
 * Assigns a fine and writes an ActivityLog entry atomically.
 * The fine must belong to an active season.
 */
export async function assignFine(
  data: Omit<Fine, "id" | "createdAt" | "deletedAt">,
  actorId: string,
): Promise<Fine> {
  const activeSeason = await getActiveSeason(data.teamId);
  if (!activeSeason || activeSeason.id !== data.seasonId) {
    throw new Error("Bøden skal tildeles i en aktiv sæson");
  }

  const batch = writeBatch(db);

  const colRef = finesCol(data.teamId);
  const fineRef = doc(colRef);
  const fine: Fine = {
    id: fineRef.id,
    ...data,
    createdAt: new Date().toISOString(),
  };
  batch.set(fineRef, fine);

  const logColRef = activityLogCol(data.teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId: data.teamId,
    actorId,
    action: "fine.assigned",
    entityType: "fine",
    entityId: fineRef.id,
    metadata: {
      title: data.title,
      amount: data.amount,
      assignedTo: data.assignedTo,
      seasonId: data.seasonId,
    },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return fine;
}

/**
 * Assigns a fine, creates its unpaid payment, and writes the fine.assigned log in one batch.
 * This keeps F001 resilient so we never persist a fine without a matching payment.
 * Updates UserSeasonBalance for each assigned user (F024).
 * Applies pending tournament credit (F031) if available.
 */
export async function assignFineWithPayment(
  data: Omit<Fine, "id" | "createdAt" | "deletedAt">,
  actorId: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ fines: Fine[]; payments: Payment[] }> {
  const activeSeason = await getActiveSeason(data.teamId);
  if (!activeSeason || activeSeason.id !== data.seasonId) {
    throw new Error("Bøden skal tildeles i en aktiv sæson");
  }

  const targetUserIds = data.assignedTo.filter(Boolean);
  if (targetUserIds.length === 0) {
    throw new Error("Bøden mangler modtager");
  }

  const total = targetUserIds.length;
  const MAX_OPS_PER_BATCH = 450;
  const OPS_PER_FINE = 10; // fine + payment + payment log + fine log + balance + season + balance log + season delta application + balance update + credit log
  const maxFinesPerBatch = Math.floor(MAX_OPS_PER_BATCH / OPS_PER_FINE);

  const allFines: Fine[] = [];
  const allPayments: Payment[] = [];
  let completed = 0;

  // Process in batches if needed
  for (let i = 0; i < targetUserIds.length; i += maxFinesPerBatch) {
    const batchUserIds = targetUserIds.slice(i, i + maxFinesPerBatch);
    const batch = writeBatch(db);

    const fines: Fine[] = [];
    const payments: Payment[] = [];
    const userBalanceByUserId = new Map<string, Awaited<ReturnType<typeof getOrCreateUserSeasonBalance>>>();
    
    // Use accumulator to avoid stale reads when updating multiple users' balances
    const seasonDeltaAccumulator: SeasonDeltaAccumulator = {};

    for (const targetUserId of batchUserIds) {
      const createdAt = new Date().toISOString();

      // Fetch balance once per user per batch to avoid stale reads when the same
      // user is assigned multiple fines in a single operation.
      let userBalance = userBalanceByUserId.get(targetUserId);
      if (!userBalance) {
        userBalance = await getOrCreateUserSeasonBalance(
          targetUserId,
          data.teamId,
          data.seasonId,
          batch,
        );
        userBalanceByUserId.set(targetUserId, userBalance);
      }
      const pendingCredit = userBalance.pendingCredit ?? 0;

      // Calculate credit application
      const creditApplication = calculatePendingCreditApplication(
        pendingCredit,
        data.amount,
      );

      // Create fine with potentially reduced amount
      const fineRef = doc(finesCol(data.teamId));
      const fine: Fine = {
        id: fineRef.id,
        ...data,
        amount: creditApplication.newFineAmount,
        assignedTo: [targetUserId],
        createdAt,
      };
      batch.set(fineRef, fine);
      fines.push(fine);

      // Create payment with potentially reduced amount
      const paymentRef = doc(paymentsCol(data.teamId));
      const payment: Payment = {
        id: paymentRef.id,
        fineIds: [fine.id],
        userId: targetUserId,
        amount: creditApplication.newFineAmount,
        status: "unpaid",
      };
      batch.set(paymentRef, payment);
      payments.push(payment);

      // Log payment creation
      const paymentLogRef = doc(activityLogCol(data.teamId));
      const paymentLogEntry: ActivityLog = {
        id: paymentLogRef.id,
        teamId: data.teamId,
        actorId,
        action: "payment.created",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          fineIds: [fine.id],
          userId: payment.userId,
          amount: payment.amount,
        },
        createdAt,
      };
      batch.set(paymentLogRef, paymentLogEntry);

      // Log fine assignment
      const logRef = doc(activityLogCol(data.teamId));
      const logEntry: ActivityLog = {
        id: logRef.id,
        teamId: data.teamId,
        actorId,
        action: "fine.assigned",
        entityType: "fine",
        entityId: fine.id,
        metadata: {
          title: data.title,
          amount: creditApplication.newFineAmount,
          assignedTo: [targetUserId],
          seasonId: data.seasonId,
          paymentId: payment.id,
        },
        createdAt,
      };
      batch.set(logRef, logEntry);

      // Log credit application if any credit was applied (F031)
      if (creditApplication.appliedCredit > 0) {
        // FIX: Consolidate balance update to prevent double batch.set() bug.
        // When credit is applied, we MUST NOT call updateUserSeasonBalance() because:
        // 1. It fetches STALE balance from Firestore (doesn't see uncommitted batch changes)
        // 2. Its second batch.set() would overwrite our credit update with stale data
        // 3. This caused silent data loss: credit was never decremented
        //
        // Instead, we consolidate all balance updates here in one atomic batch.set()

        const creditLogRef = doc(activityLogCol(data.teamId));
        const creditLogEntry: ActivityLog = {
          id: creditLogRef.id,
          teamId: data.teamId,
          actorId,
          action: "credit.applied",
          entityType: "userSeasonBalance",
          entityId: userBalance.id,
          metadata: {
            userId: targetUserId,
            creditApplied: creditApplication.appliedCredit,
            originalFineAmount: data.amount,
            newFineAmount: creditApplication.newFineAmount,
          },
          createdAt,
        };
        batch.set(creditLogRef, creditLogEntry);

        // Consolidate: Update BOTH credit AND outstanding balance in single batch.set()
        const balanceRef = userSeasonBalanceDoc(data.teamId, userBalance.id);
        const updatedBalance = {
          ...userBalance,
          pendingCredit: creditApplication.remainingCredit,
          outstandingBalance: userBalance.outstandingBalance + creditApplication.newFineAmount,
          updatedAt: createdAt,
        };
        batch.set(balanceRef, updatedBalance);
        userBalanceByUserId.set(targetUserId, updatedBalance);

        // Log the balance update
        const balanceLogRef = doc(activityLogCol(data.teamId));
        const balanceLogEntry: ActivityLog = {
          id: balanceLogRef.id,
          teamId: data.teamId,
          actorId,
          action: "balance.updated",
          entityType: "userSeasonBalance",
          entityId: userBalance.id,
          metadata: {
            userId: targetUserId,
            seasonId: data.seasonId,
            delta: { outstandingBalance: creditApplication.newFineAmount } as BalanceDelta,
            trigger: "fine.assigned",
          },
          createdAt,
        };
        batch.set(balanceLogRef, balanceLogEntry);

        // Manually accumulate season delta with the adjusted fine amount
        const current = seasonDeltaAccumulator[data.seasonId] || {};
        seasonDeltaAccumulator[data.seasonId] = {
          outstandingBalance: (current.outstandingBalance ?? 0) + creditApplication.newFineAmount,
          pendingBalance: current.pendingBalance ?? 0,
          approvedBalance: current.approvedBalance ?? 0,
        };
      } else {
        // No credit applied: use normal balance update path (F024)
        // Pass the existing balance to avoid creating duplicate documents
        await updateUserSeasonBalance(
          targetUserId,
          data.teamId,
          data.seasonId,
          { outstandingBalance: creditApplication.newFineAmount },
          "fine.assigned",
          actorId,
          batch,
          seasonDeltaAccumulator,
          userBalance,  // Pass the balance we already fetched
        );

        userBalanceByUserId.set(targetUserId, {
          ...userBalance,
          outstandingBalance: userBalance.outstandingBalance + creditApplication.newFineAmount,
          updatedAt: createdAt,
        });
      }
    }

    // Apply accumulated season deltas in a single atomic operation
    await applySeasonDeltas(data.teamId, data.seasonId, seasonDeltaAccumulator, batch);

    await batch.commit();
    
    allFines.push(...fines);
    allPayments.push(...payments);
    completed += batchUserIds.length;
    onProgress?.(completed, total);
  }

  return { fines: allFines, payments: allPayments };
}

/**
 * Soft-deletes a fine by setting deletedAt. Never hard-deletes.
 * Writes an ActivityLog entry atomically.
 * Updates UserSeasonBalance based on payment status (F024).
 */
export async function softDeleteFine(
  teamId: string,
  fineId: string,
  actorId: string,
): Promise<void> {
  const existing = await getFine(teamId, fineId);
  if (!existing) throw new Error(`Fine ${fineId} not found in team ${teamId}`);

  // Get payments for this fine
  const q = query(paymentsCol(teamId), where("fineIds", "array-contains", fineId));
  const paymentsSnap = await getDocs(q);
  const payments = paymentsSnap.docs.map((d) => d.data());

  // Also check legacy fineId field
  const qLegacy = query(paymentsCol(teamId), where("fineId", "==", fineId));
  const legacySnap = await getDocs(qLegacy);
  payments.push(...legacySnap.docs.map((d) => d.data()));

  const batch = writeBatch(db);

  const fRef = fineDoc(teamId, fineId);
  const deleted: Fine = { ...existing, deletedAt: new Date().toISOString() };
  batch.set(fRef, deleted);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "fine.deleted",
    entityType: "fine",
    entityId: fineId,
    metadata: { title: existing.title, amount: existing.amount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Use accumulator to avoid stale reads when updating multiple users' balances
  const seasonDeltaAccumulator: SeasonDeltaAccumulator = {};

  // Update balances for each payment based on status
  for (const payment of payments) {

    const delta =
      payment.status === "approved"
        ? { approvedBalance: -payment.amount }
        : payment.status === "pending"
          ? { pendingBalance: -payment.amount }
          : { outstandingBalance: -payment.amount }; // unpaid or disputed

    await updateUserSeasonBalance(
      payment.userId,
      teamId,
      existing.seasonId,
      delta,
      "fine.deleted",
      actorId,
      batch,
      seasonDeltaAccumulator,
    );
  }

  // Apply accumulated season deltas in a single atomic operation
  await applySeasonDeltas(teamId, existing.seasonId, seasonDeltaAccumulator, batch);

  await batch.commit();
}

/**
 * Restores a soft-deleted fine by clearing deletedAt.
 * Writes an ActivityLog entry atomically.
 * Updates UserSeasonBalance based on payment status (F024).
 */
export async function restoreFine(
  teamId: string,
  fineId: string,
  actorId: string,
): Promise<void> {
  const existing = await getFine(teamId, fineId);
  if (!existing) throw new Error(`Fine ${fineId} not found in team ${teamId}`);

  // Get payments for this fine
  const q = query(paymentsCol(teamId), where("fineIds", "array-contains", fineId));
  const paymentsSnap = await getDocs(q);
  const payments = paymentsSnap.docs.map((d) => d.data());

  // Also check legacy fineId field
  const qLegacy = query(paymentsCol(teamId), where("fineId", "==", fineId));
  const legacySnap = await getDocs(qLegacy);
  payments.push(...legacySnap.docs.map((d) => d.data()));

  const batch = writeBatch(db);

  const fRef = fineDoc(teamId, fineId);
  const { deletedAt, ...withoutDeleted } = existing;
  void deletedAt;
  const restored: Fine = { ...withoutDeleted };
  batch.set(fRef, restored);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "fine.restored",
    entityType: "fine",
    entityId: fineId,
    metadata: { title: existing.title, amount: existing.amount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Use accumulator to avoid stale reads when updating multiple users' balances
  const seasonDeltaAccumulator: SeasonDeltaAccumulator = {};

  // Update balances for each payment (reverse the delete operation)
  for (const payment of payments) {
    const delta =
      payment.status === "approved"
        ? { approvedBalance: payment.amount }
        : payment.status === "pending"
          ? { pendingBalance: payment.amount }
          : { outstandingBalance: payment.amount }; // unpaid or disputed

    await updateUserSeasonBalance(
      payment.userId,
      teamId,
      existing.seasonId,
      delta,
      "fine.restored",
      actorId,
      batch,
      seasonDeltaAccumulator,
    );
  }

  // Apply accumulated season deltas in a single atomic operation
  await applySeasonDeltas(teamId, existing.seasonId, seasonDeltaAccumulator, batch);

  await batch.commit();
}

/**
 * Removes a specific member from a fine's assignedTo array.
 * If assignedTo becomes empty, soft-deletes the fine.
 * Otherwise, updates the fine with the new assignedTo array.
 * Writes an ActivityLog entry atomically (F027).
 * Updates UserSeasonBalance based on payment status.
 */
export async function removeMemberFromFine(
  teamId: string,
  fineId: string,
  userId: string,
  actorId: string,
): Promise<void> {
  const existing = await getFine(teamId, fineId);
  if (!existing) throw new Error(`Fine ${fineId} not found in team ${teamId}`);

  if (!existing.assignedTo.includes(userId)) {
    throw new Error(`User ${userId} is not assigned to fine ${fineId}`);
  }

  // Get payment for this user and fine
  let payment: Payment | null = null;
  
  // Try new fineIds format
  const q = query(
    paymentsCol(teamId),
    where("userId", "==", userId),
    where("fineIds", "array-contains", fineId),
  );
  const snap = await getDocs(q);
  if (snap.docs.length > 0) {
    payment = snap.docs[0].data();
  } else {
    // Try legacy fineId format
    const qLegacy = query(
      paymentsCol(teamId),
      where("userId", "==", userId),
      where("fineId", "==", fineId),
    );
    const snapLegacy = await getDocs(qLegacy);
    if (snapLegacy.docs.length > 0) {
      payment = snapLegacy.docs[0].data();
    }
  }

  const batch = writeBatch(db);

  // Remove user from assignedTo
  const newAssignedTo = existing.assignedTo.filter((id) => id !== userId);

  if (newAssignedTo.length === 0) {
    // If no more assignees, soft-delete the entire fine
    const fRef = fineDoc(teamId, fineId);
    const deleted: Fine = { ...existing, deletedAt: new Date().toISOString() };
    batch.set(fRef, deleted);
  } else {
    // Otherwise, just update the assignedTo array
    const fRef = fineDoc(teamId, fineId);
    const updated: Fine = { ...existing, assignedTo: newAssignedTo };
    batch.set(fRef, updated);
  }

  // Create activity log entry
  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "fine.memberRemoved",
    entityType: "fine",
    entityId: fineId,
    metadata: {
      title: existing.title,
      amount: existing.amount,
      removedUserId: userId,
      remainingAssignees: newAssignedTo.length,
    },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Update user's season balance if payment exists
  if (payment) {
    const delta =
      payment.status === "approved"
        ? { approvedBalance: -payment.amount }
        : payment.status === "pending"
          ? { pendingBalance: -payment.amount }
          : { outstandingBalance: -payment.amount }; // unpaid or disputed

    await updateUserSeasonBalance(
      userId,
      teamId,
      existing.seasonId,
      delta,
      "fine.memberRemoved",
      actorId,
      batch,
    );
  }

  await batch.commit();
}

/**
 * Bulk soft-delete multiple fines with progress tracking.
 * Batches are committed in chunks of 450 operations (safe limit for Firestore).
 * Returns successfully deleted fine IDs.
 */
export async function bulkSoftDeleteFines(
  teamId: string,
  fineIds: string[],
  actorId: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ deletedIds: string[]; errors: Array<{ fineId: string; error: string }> }> {
  const deletedIds: string[] = [];
  const errors: Array<{ fineId: string; error: string }> = [];
  const total = fineIds.length;
  const MAX_OPS_PER_BATCH = 450;

  let batch = writeBatch(db);
  let opsInBatch = 0;
  let completedCount = 0;

  for (const fineId of fineIds) {
    try {
      const existing = await getFine(teamId, fineId);
      if (!existing) {
        errors.push({ fineId, error: "Bøde ikke fundet" });
        completedCount++;
        onProgress?.(completedCount, total);
        continue;
      }

      if (existing.deletedAt) {
        errors.push({ fineId, error: "Bøde allerede slettet" });
        completedCount++;
        onProgress?.(completedCount, total);
        continue;
      }

      const createdAt = new Date().toISOString();
      const fRef = fineDoc(teamId, fineId);
      const deleted: Fine = { ...existing, deletedAt: createdAt };
      batch.set(fRef, deleted);
      opsInBatch++;

      const logRef = doc(activityLogCol(teamId));
      const logEntry: ActivityLog = {
        id: logRef.id,
        teamId,
        actorId,
        action: "fine.deleted",
        entityType: "fine",
        entityId: fineId,
        metadata: { title: existing.title, amount: existing.amount },
        createdAt,
      };
      batch.set(logRef, logEntry);
      opsInBatch++;

      deletedIds.push(fineId);

      // Commit batch when approaching limit
      if (opsInBatch >= MAX_OPS_PER_BATCH) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }

      completedCount++;
      onProgress?.(completedCount, total);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      errors.push({ fineId, error: message });
      completedCount++;
      onProgress?.(completedCount, total);
    }
  }

  // Commit remaining operations
  if (opsInBatch > 0) {
    await batch.commit();
  }

  return { deletedIds, errors };
}

/**
 * Bulk restore multiple soft-deleted fines with progress tracking.
 * Returns successfully restored fine IDs.
 */
export async function bulkRestoreFines(
  teamId: string,
  fineIds: string[],
  actorId: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ restoredIds: string[]; errors: Array<{ fineId: string; error: string }> }> {
  const restoredIds: string[] = [];
  const errors: Array<{ fineId: string; error: string }> = [];
  const total = fineIds.length;
  const MAX_OPS_PER_BATCH = 450;

  let batch = writeBatch(db);
  let opsInBatch = 0;
  let completedCount = 0;

  for (const fineId of fineIds) {
    try {
      const existing = await getFine(teamId, fineId);
      if (!existing) {
        errors.push({ fineId, error: "Bøde ikke fundet" });
        completedCount++;
        onProgress?.(completedCount, total);
        continue;
      }

      if (!existing.deletedAt) {
        errors.push({ fineId, error: "Bøde ikke slettet" });
        completedCount++;
        onProgress?.(completedCount, total);
        continue;
      }

      const createdAt = new Date().toISOString();
      const fRef = fineDoc(teamId, fineId);
      const { deletedAt, ...withoutDeleted } = existing;
      void deletedAt;
      const restored: Fine = { ...withoutDeleted };
      batch.set(fRef, restored);
      opsInBatch++;

      const logRef = doc(activityLogCol(teamId));
      const logEntry: ActivityLog = {
        id: logRef.id,
        teamId,
        actorId,
        action: "fine.restored",
        entityType: "fine",
        entityId: fineId,
        metadata: { title: existing.title, amount: existing.amount },
        createdAt,
      };
      batch.set(logRef, logEntry);
      opsInBatch++;

      restoredIds.push(fineId);

      // Commit batch when approaching limit
      if (opsInBatch >= MAX_OPS_PER_BATCH) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }

      completedCount++;
      onProgress?.(completedCount, total);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      errors.push({ fineId, error: message });
      completedCount++;
      onProgress?.(completedCount, total);
    }
  }

  // Commit remaining operations
  if (opsInBatch > 0) {
    await batch.commit();
  }

  return { restoredIds, errors };
}
