import { getDocs, getDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { finesCol, fineDoc, activityLogCol } from "./refs";
import type { Fine, ActivityLog } from "../../types/domain";

export async function getFines(
  teamId: string,
  includeDeleted = false,
): Promise<Fine[]> {
  const snap = await getDocs(finesCol(teamId));
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
 * Soft-deletes a fine by setting deletedAt. Never hard-deletes.
 * Writes an ActivityLog entry atomically.
 */
export async function softDeleteFine(
  teamId: string,
  fineId: string,
  actorId: string,
): Promise<void> {
  const existing = await getFine(teamId, fineId);
  if (!existing) throw new Error(`Fine ${fineId} not found in team ${teamId}`);

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

  await batch.commit();
}

/**
 * Restores a soft-deleted fine by clearing deletedAt.
 * Writes an ActivityLog entry atomically.
 */
export async function restoreFine(
  teamId: string,
  fineId: string,
  actorId: string,
): Promise<void> {
  const existing = await getFine(teamId, fineId);
  if (!existing) throw new Error(`Fine ${fineId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  const fRef = fineDoc(teamId, fineId);
  const { deletedAt: _, ...withoutDeleted } = existing;
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

  await batch.commit();
}
