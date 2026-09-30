import { getDocs, doc, writeBatch, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { interestChargesCol, activityLogCol } from "./refs";
import type { InterestCharge, ActivityLog } from "../../types/domain";

/**
 * Gets all interest charges for a specific user in a team.
 */
export async function getInterestChargesForUser(
  teamId: string,
  userId: string,
): Promise<InterestCharge[]> {
  const q = query(interestChargesCol(teamId), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Gets all interest charges for a team in a specific season.
 */
export async function getInterestChargesForSeason(
  teamId: string,
  seasonId: string,
): Promise<InterestCharge[]> {
  const q = query(interestChargesCol(teamId), where("seasonId", "==", seasonId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Gets all interest charges for a team.
 */
export async function getInterestCharges(teamId: string): Promise<InterestCharge[]> {
  const snap = await getDocs(interestChargesCol(teamId));
  return snap.docs.map((d) => d.data());
}

/**
 * Creates an InterestCharge and writes an ActivityLog entry atomically.
 * Called by the daily Cloud Function when a member has unpaid fines from the previous month.
 */
export async function createInterestCharge(
  teamId: string,
  data: Omit<InterestCharge, "id" | "createdAt">,
): Promise<InterestCharge> {
  const batch = writeBatch(db);

  const colRef = interestChargesCol(teamId);
  const chargeRef = doc(colRef);
  const charge: InterestCharge = {
    id: chargeRef.id,
    ...data,
    createdAt: new Date().toISOString(),
  };
  batch.set(chargeRef, charge);

  // Write ActivityLog entry with system actor (Cloud Function has no user ID)
  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId: "system",
    action: "interest.charged",
    entityType: "interestCharge",
    entityId: chargeRef.id,
    metadata: {
      userId: data.userId,
      amount: data.amount,
      month: data.month,
      chargedOn: data.chargedOn,
    },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return charge;
}
