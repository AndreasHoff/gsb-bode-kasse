import { doc, setDoc } from "firebase/firestore";
import { activityLogCol } from "./refs";
import type { ActivityLog } from "../../types/domain";

// Action strings — must match exactly the strings used in F007 spec rendering
export type ActivityLogAction =
  | "fine.assigned"
  | "fine.deleted"
  | "fine.restored"
  | "payment.initiated"
  | "payment.approved"
  | "payment.disputed"
  | "season.created"
  | "season.closed"
  | "member.added"
  | "member.roleChanged";

export type LogActivityInput = {
  teamId: string;
  actorId: string;
  action: ActivityLogAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

/**
 * Appends a single ActivityLog entry.
 * This is used internally by all mutation helpers — never call from client
 * directly (use a batch or transaction alongside the mutation write).
 * When called standalone it still produces a consistent log entry.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  const colRef = activityLogCol(input.teamId);
  const docRef = doc(colRef);
  const entry: ActivityLog = {
    id: docRef.id,
    teamId: input.teamId,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    createdAt: new Date().toISOString(),
  };
  await setDoc(docRef, entry);
}
