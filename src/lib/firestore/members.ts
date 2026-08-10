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
import { membersCol, memberDoc, activityLogCol, finesCol } from "./refs";
import { membershipConverter } from "./converters";
import { getUsers } from "./users";
import type { Membership, ActivityLog, Fine } from "../../types/domain";

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

/**
 * Ensures all user profiles have an active membership in the given team.
 * Missing memberships are created as `member`.
 */
export async function backfillTeamMembershipsForAllUsers(
  teamId: string,
): Promise<{ created: number; existing: number }> {
  const [users, currentMemberships] = await Promise.all([
    getUsers(),
    getMemberships(teamId),
  ]);

  const existingUserIds = new Set(currentMemberships.map((m) => m.userId));

  let batch = writeBatch(db);
  let pendingWrites = 0;
  let created = 0;
  let existing = 0;

  for (const user of users) {
    if (existingUserIds.has(user.id)) {
      existing += 1;
      continue;
    }

    const membership: Membership = {
      id: user.id,
      userId: user.id,
      teamId,
      role: "member",
      joinedAt: new Date().toISOString(),
      isActive: true,
    };

    batch.set(memberDoc(teamId, user.id), membership);
    pendingWrites += 1;
    created += 1;

    if (pendingWrites >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      pendingWrites = 0;
    }
  }

  if (pendingWrites > 0) {
    await batch.commit();
  }

  return { created, existing };
}

/**
 * Deactivates a membership and soft-deletes all fines assigned to that user.
 * Writes a member.removed ActivityLog entry and individual fine.deleted entries.
 * Processes fines in batches to stay within Firestore's 500-op limit.
 */
export async function removeMember(
  teamId: string,
  userId: string,
  actorId: string,
): Promise<void> {
  const memberRef = memberDoc(teamId, userId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) throw new Error(`Membership not found for user ${userId}`);

  const existing = memberSnap.data();

  // Deactivate membership + write member.removed log
  const memberBatch = writeBatch(db);
  memberBatch.set(memberRef, { ...existing, isActive: false });

  const logColRef = activityLogCol(teamId);
  const removedLogRef = doc(logColRef);
  const removedLog: ActivityLog = {
    id: removedLogRef.id,
    teamId,
    actorId,
    action: "member.removed",
    entityType: "membership",
    entityId: userId,
    metadata: { userId, role: existing.role },
    createdAt: new Date().toISOString(),
  };
  memberBatch.set(removedLogRef, removedLog);
  await memberBatch.commit();

  // Soft-delete all active fines assigned to this user
  const finesSnap = await getDocs(
    query(finesCol(teamId), where("assignedTo", "array-contains", userId)),
  );
  const activeFines = finesSnap.docs.filter((d) => !d.data().deletedAt);
  if (activeFines.length === 0) return;

  const MAX_OPS = 450;
  const now = new Date().toISOString();
  let fineBatch = writeBatch(db);
  let opsCount = 0;

  for (const fineDocSnap of activeFines) {
    const fine = fineDocSnap.data() as Fine;
    fineBatch.set(fineDocSnap.ref, { ...fine, deletedAt: now });

    const fineLogRef = doc(logColRef);
    const fineLog: ActivityLog = {
      id: fineLogRef.id,
      teamId,
      actorId,
      action: "fine.deleted",
      entityType: "fine",
      entityId: fineDocSnap.id,
      metadata: { title: fine.title, amount: fine.amount, reason: "member.removed" },
      createdAt: now,
    };
    fineBatch.set(fineLogRef, fineLog);

    opsCount += 2;
    if (opsCount >= MAX_OPS) {
      await fineBatch.commit();
      fineBatch = writeBatch(db);
      opsCount = 0;
    }
  }

  if (opsCount > 0) {
    await fineBatch.commit();
  }
}
