import { getDocs, getDoc, doc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { finesCol, fineDoc, activityLogCol, paymentsCol, paymentDoc } from "./refs";
import type { Fine, ActivityLog, Payment } from "../../types/domain";
import { getActiveSeason } from "./seasons";
import { updateUserSeasonBalance } from "./balances";

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
  const OPS_PER_FINE = 7; // fine + payment + payment log + fine log + balance + season + balance log
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

    for (const targetUserId of batchUserIds) {
      const createdAt = new Date().toISOString();

      const fineRef = doc(finesCol(data.teamId));
      const fine: Fine = {
        id: fineRef.id,
        ...data,
        assignedTo: [targetUserId],
        createdAt,
      };
      batch.set(fineRef, fine);
      fines.push(fine);

      const paymentRef = doc(paymentsCol(data.teamId));
      const payment: Payment = {
        id: paymentRef.id,
        fineIds: [fine.id],
        userId: targetUserId,
        amount: data.amount,
        status: "unpaid",
      };
      batch.set(paymentRef, payment);
      payments.push(payment);

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
          amount: data.amount,
          assignedTo: [targetUserId],
          seasonId: data.seasonId,
          paymentId: payment.id,
        },
        createdAt,
      };
      batch.set(logRef, logEntry);

      // Update balance for the assigned user (F024)
      await updateUserSeasonBalance(
        targetUserId,
        data.teamId,
        data.seasonId,
        { outstandingBalance: data.amount },
        "fine.assigned",
        actorId,
        batch,
      );
    }

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
    );
  }

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
