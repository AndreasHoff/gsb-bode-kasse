import { getDocs, getDoc, doc, setDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { paymentsCol, paymentDoc, activityLogCol } from "./refs";
import type { Payment, ActivityLog } from "../../types/domain";

export async function getPayments(teamId: string): Promise<Payment[]> {
  const snap = await getDocs(paymentsCol(teamId));
  return snap.docs.map((d) => d.data());
}

export async function getPaymentsForUser(
  teamId: string,
  userId: string,
): Promise<Payment[]> {
  const q = query(paymentsCol(teamId), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Returns all payments for a team with status "pending".
 */
export async function getPendingPayments(teamId: string): Promise<Payment[]> {
  const q = query(paymentsCol(teamId), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getPayment(
  teamId: string,
  paymentId: string,
): Promise<Payment | null> {
  const snap = await getDoc(paymentDoc(teamId, paymentId));
  return snap.exists() ? snap.data() : null;
}

/**
 * Creates a payment record with status "unpaid".
 * Called when a fine is assigned to a user.
 */
export async function createPayment(
  teamId: string,
  data: Omit<Payment, "id" | "status" | "initiatedAt" | "approvedAt" | "approvedBy">,
): Promise<Payment> {
  const colRef = paymentsCol(teamId);
  const docRef = doc(colRef);
  const payment: Payment = {
    id: docRef.id,
    ...data,
    status: "unpaid",
  };

  // Payment creation is done as part of fine assignment — no separate log here.
  // The fine.assigned log covers this event.
  await setDoc(docRef, payment);
  return payment;
}

/**
 * Transitions payment status from "unpaid" → "pending".
 * Writes an ActivityLog entry atomically.
 */
export async function initiatePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  const pRef = paymentDoc(teamId, paymentId);
  const updated: Payment = {
    ...existing,
    status: "pending",
    initiatedAt: new Date().toISOString(),
  };
  batch.set(pRef, updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "payment.initiated",
    entityType: "payment",
    entityId: paymentId,
    metadata: { fineId: existing.fineId, amount: existing.amount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return updated;
}

/**
 * Transitions payment status from "pending" → "approved".
 * Only admins may call this.
 * Writes an ActivityLog entry atomically.
 */
export async function approvePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  const pRef = paymentDoc(teamId, paymentId);
  const updated: Payment = {
    ...existing,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: actorId,
  };
  batch.set(pRef, updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "payment.approved",
    entityType: "payment",
    entityId: paymentId,
    metadata: { fineId: existing.fineId, amount: existing.amount, userId: existing.userId },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return updated;
}

/**
 * Transitions payment status to "disputed".
 * Writes an ActivityLog entry atomically.
 */
export async function disputePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  const pRef = paymentDoc(teamId, paymentId);
  const updated: Payment = { ...existing, status: "disputed" };
  batch.set(pRef, updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "payment.disputed",
    entityType: "payment",
    entityId: paymentId,
    metadata: { fineId: existing.fineId, amount: existing.amount, userId: existing.userId },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return updated;
}
