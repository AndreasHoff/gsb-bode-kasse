import { getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { usersCol } from "./refs";
import { userDoc } from "./refs";
import type { User } from "../../types/domain";
import { db } from "../firebase";

export async function getUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(userDoc(userId));
  return snap.exists() ? snap.data() : null;
}

export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(usersCol());
  return snap.docs.map((doc) => doc.data());
}

export async function ensureUserProfile(
  input: Pick<User, "id" | "name" | "email" | "avatarUrl">,
): Promise<User> {
  const existing = await getUserProfile(input.id);

  if (existing) {
    return existing;
  }

  const user: User = {
    id: input.id,
    name: input.name,
    email: input.email,
    avatarUrl: input.avatarUrl,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userDoc(user.id), user);
  return user;
}

/** Updates the mutable fields of a user profile (currently: name). */
export async function updateUserProfile(
  userId: string,
  updates: Pick<User, "name">,
): Promise<void> {
  await setDoc(
    userDoc(userId),
    {
      id: userId,
      name: updates.name,
    },
    { merge: true },
  );
}

/**
 * Resets the outstanding fine balance and total paid amount for all users in the database.
 * This is a destructive administrative action that resets summary totals only, preserving historical records.
 */
export async function resetUserFinancialTotals(): Promise<void> {
  console.log("Starting financial total reset process...");

  const users = await getUsers();
  if (users.length === 0) {
    console.warn("No user profiles found to reset.");
    return;
  }

  const batch = writeBatch(db);
  let count = 0;

  for (const user of users) {
    const userId = user.id;
    // Only update if the fields are not already zero, or if we want to force reset regardless.
    // For safety and completeness in an admin tool, we will always write the zero values.
    batch.set(userDoc(userId), {
      outstandingFineBalance: 0,
      totalPaidAmount: 0,
    }, { merge: true });
    count++;
  }

  await batch.commit();
  console.log(`Successfully reset financial totals for ${count} users.`);
}

/**
 * Wipes all issued fines and payment data for a team.
 * This is a destructive testing/admin action for wiping test data.
 * 
 * DELETES:
 * - All issued fines (fines assigned to members)
 * - All payment records
 * 
 * PRESERVES:
 * - Fine rule templates (fineRules collection)
 * - Member data
 * - Team metadata
 */
export async function wipeFineDataForTeam(teamId: string): Promise<{ finesDeleted: number; paymentsDeleted: number }> {
  if (!teamId) {
    throw new Error("Team ID is required");
  }

  // Import inside function to avoid circular dependencies
  const { getFines } = await import("./fines");
  const { getPayments } = await import("./payments");
  const { fineDoc, paymentDoc } = await import("./refs");

  console.log(`Starting fine data wipe for team ${teamId}...`);

  // Fetch all fines and payments for this team
  const [allFines, allPayments] = await Promise.all([
    getFines(teamId, true), // include deleted
    getPayments(teamId),
  ]);

  if (allFines.length === 0 && allPayments.length === 0) {
    console.warn("No fines or payments found to wipe.");
    return { finesDeleted: 0, paymentsDeleted: 0 };
  }

  // Delete in batches (Firestore has 500 op limit per batch)
  const MAX_OPS_PER_BATCH = 400;
  let finesDeleted = 0;
  let paymentsDeleted = 0;

  // Hard-delete all issued fines
  for (let i = 0; i < allFines.length; i += MAX_OPS_PER_BATCH) {
    const batch = writeBatch(db);
    const finesToDelete = allFines.slice(i, i + MAX_OPS_PER_BATCH);

    for (const fine of finesToDelete) {
      const fRef = fineDoc(teamId, fine.id);
      batch.delete(fRef);
      finesDeleted++;
    }

    await batch.commit();
  }

  // Hard-delete all payments
  for (let i = 0; i < allPayments.length; i += MAX_OPS_PER_BATCH) {
    const batch = writeBatch(db);
    const paymentsToDelete = allPayments.slice(i, i + MAX_OPS_PER_BATCH);

    for (const payment of paymentsToDelete) {
      const pRef = paymentDoc(teamId, payment.id);
      batch.delete(pRef);
      paymentsDeleted++;
    }

    await batch.commit();
  }

  console.log(`Successfully wiped ${finesDeleted} fines and ${paymentsDeleted} payments for team ${teamId}.`);
  return { finesDeleted, paymentsDeleted };
}