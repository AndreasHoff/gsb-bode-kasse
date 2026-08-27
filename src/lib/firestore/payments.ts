import { getDocs, getDoc, doc, setDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { paymentsCol, paymentDoc, activityLogCol } from "./refs";
import type { Payment, ActivityLog } from "../../types/domain";
import { getFine } from "./fines";
import { getActiveSeason } from "./seasons";
import { updateUserSeasonBalance } from "./balances";

/**
 * Helper to get fine IDs from a payment, handling backward compatibility.
 * Old payments have `fineId`, new payments have `fineIds[]`.
 */
function getFineIdsFromPayment(payment: Payment): string[] {
  if (payment.fineIds && payment.fineIds.length > 0) {
    return payment.fineIds;
  }
  if (payment.fineId) {
    return [payment.fineId];
  }
  return [];
}

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
 * Updates UserSeasonBalance (F024).
 */
export async function initiatePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found in team ${teamId}`);

  // Get season ID from one of the fines
  const fineIds = getFineIdsFromPayment(existing);
  if (fineIds.length === 0) throw new Error("Payment has no associated fines");
  
  const firstFine = await getFine(teamId, fineIds[0]);
  if (!firstFine) throw new Error("Associated fine not found");

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
    metadata: { fineIds, amount: existing.amount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Update balance: move from outstanding to pending
  await updateUserSeasonBalance(
    existing.userId,
    teamId,
    firstFine.seasonId,
    {
      outstandingBalance: -existing.amount,
      pendingBalance: existing.amount,
    },
    "payment.initiated",
    actorId,
    batch,
  );

  await batch.commit();
  return updated;
}

/**
 * Creates a combined payment for multiple fines and sets status to "pending".
 * Used when a member pays multiple fines at once via MobilePay Box.
 * Writes an ActivityLog entry atomically.
 * Updates UserSeasonBalance (F024).
 */
export async function createCombinedPayment(
  teamId: string,
  fineIds: string[],
  userId: string,
  totalAmount: number,
  actorId: string,
): Promise<Payment> {
  if (fineIds.length === 0) {
    throw new Error("Kan ikke oprette betaling uden bøder");
  }

  // 1. Validate active season exists (cheapest: 1 cached read, fails fast on bad setup)
  const activeSeason = await getActiveSeason(teamId);
  if (!activeSeason) {
    throw new Error("Ingen aktiv sæson");
  }

  // 2. Fetch all fines and validate they exist and aren't deleted (N reads, filters garbage early)
  const fines = await Promise.all(fineIds.map(fid => getFine(teamId, fid)));
  
  if (fines.some(f => !f || f.deletedAt)) {
    throw new Error("En eller flere bøder findes ikke længere");
  }

  // 3. Verify fine ownership (no I/O, fails fast if existence check failed)
  const nonOwnedFines = fines.filter(f => f && !f.assignedTo.includes(userId));
  if (nonOwnedFines.length > 0) {
    throw new Error("Du kan kun betale dine egne bøder");
  }

  // 4. Verify all fines belong to active season (no I/O, uses already-fetched data)
  const wrongSeasonFines = fines.filter(f => f && f.seasonId !== activeSeason.id);
  if (wrongSeasonFines.length > 0) {
    throw new Error("Alle bøder skal tilhøre den aktive sæson");
  }

  // 5. Validate amount matches sum of fines (pure computation, no I/O)
  const actualTotal = fines.reduce((sum, f) => sum + (f?.amount ?? 0), 0);
  if (actualTotal !== totalAmount) {
    throw new Error("Beløbet matcher ikke bødernes samlede værdi");
  }

  // 6. Check for duplicate pending payments (most expensive: full table scan, done last)
  const allPending = await getPendingPayments(teamId);
  const existingFineIds = new Set<string>();
  for (const p of allPending) {
    const pFineIds = getFineIdsFromPayment(p);
    for (const fid of pFineIds) {
      existingFineIds.add(fid);
    }
  }
  const duplicates = fineIds.filter(fid => existingFineIds.has(fid));
  if (duplicates.length > 0) {
    throw new Error("En betaling for disse bøder er allerede i gang");
  }

  const batch = writeBatch(db);

  const paymentRef = doc(paymentsCol(teamId));
  const payment: Payment = {
    id: paymentRef.id,
    fineIds,
    userId,
    amount: totalAmount,
    status: "pending",
    initiatedAt: new Date().toISOString(),
  };
  batch.set(paymentRef, payment);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "payment.initiated",
    entityType: "payment",
    entityId: payment.id,
    metadata: { fineIds, amount: totalAmount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Update balance: move from outstanding to pending
  await updateUserSeasonBalance(
    userId,
    teamId,
    activeSeason.id,
    {
      outstandingBalance: -totalAmount,
      pendingBalance: totalAmount,
    },
    "payment.initiated",
    actorId,
    batch,
  );

  await batch.commit();
  return payment;
}

/**
 * Transitions payment status from "pending" → "approved".
 * Only admins may call this.
 * Writes an ActivityLog entry atomically.
 * Updates UserSeasonBalance (F024).
 */
export async function approvePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error("Betaling blev ikke fundet");

  // Validate payment is in pending state
  if (existing.status !== "pending") {
    throw new Error("Kan kun godkende betalinger med status 'pending'");
  }

  // Get season ID from one of the fines
  const fineIds = getFineIdsFromPayment(existing);
  if (fineIds.length === 0) throw new Error("Payment has no associated fines");
  
  const firstFine = await getFine(teamId, fineIds[0]);
  if (!firstFine) throw new Error("Associated fine not found");

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
    metadata: { fineIds, amount: existing.amount, userId: existing.userId },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Update balance: move from pending to approved
  await updateUserSeasonBalance(
    existing.userId,
    teamId,
    firstFine.seasonId,
    {
      pendingBalance: -existing.amount,
      approvedBalance: existing.amount,
    },
    "payment.approved",
    actorId,
    batch,
  );

  await batch.commit();
  return updated;
}

/**
 * Transitions payment status from "pending" → "disputed".
 * Only admins may call this.
 * Writes an ActivityLog entry atomically.
 * Updates UserSeasonBalance (F024).
 */
export async function disputePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error("Betaling blev ikke fundet");

  // Validate payment is in pending state
  if (existing.status !== "pending") {
    throw new Error("Kan kun afvise betalinger med status 'pending'");
  }

  // Get season ID from one of the fines
  const fineIds = getFineIdsFromPayment(existing);
  if (fineIds.length === 0) throw new Error("Payment has no associated fines");
  
  const firstFine = await getFine(teamId, fineIds[0]);
  if (!firstFine) throw new Error("Associated fine not found");

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
    metadata: { fineIds, amount: existing.amount, userId: existing.userId },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Update balance: move from pending to outstanding
  await updateUserSeasonBalance(
    existing.userId,
    teamId,
    firstFine.seasonId,
    {
      pendingBalance: -existing.amount,
      outstandingBalance: existing.amount,
    },
    "payment.disputed",
    actorId,
    batch,
  );

  await batch.commit();
  return updated;
}

/**
 * Returns all payments with status "approved".
 * Used for refund workflow (F015).
 */
export async function getApprovedPayments(teamId: string): Promise<Payment[]> {
  const q = query(paymentsCol(teamId), where("status", "==", "approved"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Returns all payments with status "unpaid" or "disputed".
 * Used for manual reconciliation workflow (F015).
 */
export async function getPaymentsForReconciliation(teamId: string): Promise<Payment[]> {
  const [unpaidSnap, disputedSnap] = await Promise.all([
    getDocs(query(paymentsCol(teamId), where("status", "==", "unpaid"))),
    getDocs(query(paymentsCol(teamId), where("status", "==", "disputed"))),
  ]);
  return [
    ...unpaidSnap.docs.map((d) => d.data()),
    ...disputedSnap.docs.map((d) => d.data()),
  ];
}

/**
 * Refunds an approved payment: resets status to "unpaid" and clears approval fields.
 * Writes a payment.refunded ActivityLog entry atomically.
 * Updates UserSeasonBalance (F024).
 */
export async function refundPayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found in team ${teamId}`);

  // Get season ID from one of the fines
  const fineIds = getFineIdsFromPayment(existing);
  if (fineIds.length === 0) throw new Error("Payment has no associated fines");
  
  const firstFine = await getFine(teamId, fineIds[0]);
  if (!firstFine) throw new Error("Associated fine not found");

  const batch = writeBatch(db);

  const pRef = paymentDoc(teamId, paymentId);
  const { approvedAt: _approvedAt, approvedBy: _approvedBy, ...rest } = existing;
  void _approvedAt;
  void _approvedBy;
  const updated: Payment = { ...rest, status: "unpaid" };
  batch.set(pRef, updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "payment.refunded",
    entityType: "payment",
    entityId: paymentId,
    metadata: { fineIds, amount: existing.amount, userId: existing.userId },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Update balance: move from approved to outstanding
  await updateUserSeasonBalance(
    existing.userId,
    teamId,
    firstFine.seasonId,
    {
      approvedBalance: -existing.amount,
      outstandingBalance: existing.amount,
    },
    "payment.refunded",
    actorId,
    batch,
  );

  await batch.commit();
  return updated;
}

/**
 * Manually reconciles a payment (e.g. cash paid outside MobilePay).
 * Sets status to "approved" from any non-approved state.
 * Writes a payment.reconciled ActivityLog entry atomically.
 */
export async function reconcilePayment(
  teamId: string,
  paymentId: string,
  actorId: string,
): Promise<Payment> {
  const existing = await getPayment(teamId, paymentId);
  if (!existing) throw new Error(`Payment ${paymentId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  const pRef = paymentDoc(teamId, paymentId);
  const now = new Date().toISOString();
  const updated: Payment = {
    ...existing,
    status: "approved",
    approvedAt: now,
    approvedBy: actorId,
  };
  batch.set(pRef, updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const fineIds = getFineIdsFromPayment(existing);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "payment.reconciled",
    entityType: "payment",
    entityId: paymentId,
    metadata: { fineIds, amount: existing.amount, userId: existing.userId },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  // Get season ID from one of the fines
  if (fineIds.length === 0) throw new Error("Payment has no associated fines");
  
  const firstFine = await getFine(teamId, fineIds[0]);
  if (!firstFine) throw new Error("Associated fine not found");

  // Update balance based on previous status
  const delta =
    existing.status === "pending"
      ? { pendingBalance: -existing.amount, approvedBalance: existing.amount }
      : { outstandingBalance: -existing.amount, approvedBalance: existing.amount };

  await updateUserSeasonBalance(
    existing.userId,
    teamId,
    firstFine.seasonId,
    delta,
    "payment.reconciled",
    actorId,
    batch,
  );

  await batch.commit();
  return updated;
}
