import {
  getDoc,
  getDocs,
  doc,
  writeBatch,
  collectionGroup,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { membersCol, memberDoc, activityLogCol } from "./refs";
import { membershipConverter } from "./converters";
import type { Membership, ActivityLog } from "../../types/domain";

export async function getMemberships(teamId: string): Promise<Membership[]> {
  const snap = await getDocs(membersCol(teamId));
  return snap.docs.map((d) => d.data());
}

export async function getMembership(
  teamId: string,
  membershipId: string,
): Promise<Membership | null> {
  const snap = await getDoc(memberDoc(teamId, membershipId));
  return snap.exists() ? snap.data() : null;
}

export async function getActiveMembershipsForUser(
  userId: string,
): Promise<Membership[]> {
  const membersGroup = collectionGroup(db, "members").withConverter(
    membershipConverter,
  );
  const activeMembershipsQuery = query(
    membersGroup,
    where("userId", "==", userId),
    where("isActive", "==", true),
  );

  const snap = await getDocs(activeMembershipsQuery);
  return snap.docs.map((d) => d.data());
}

/**
 * Creates or updates a membership and writes an ActivityLog entry atomically.
 *
 * The Firestore document ID is always the `userId` so that security rules can
 * resolve role via `get(/teams/{teamId}/members/{request.auth.uid})`.
 * This enforces one active membership per user per team at the document level.
 */
export async function upsertMembership(
  data: Omit<Membership, "id">,
  actorId: string,
  action: "member.added" | "member.roleChanged",
): Promise<Membership> {
  const batch = writeBatch(db);

  // Use userId as the document ID to enable efficient security rule lookups
  const memberRef = memberDoc(data.teamId, data.userId);
  const membership: Membership = { ...data, id: data.userId };
  batch.set(memberRef, membership);

  const logColRef = activityLogCol(data.teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId: data.teamId,
    actorId,
    action,
    entityType: "membership",
    entityId: memberRef.id,
    metadata: { userId: data.userId, role: data.role },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return membership;
}
