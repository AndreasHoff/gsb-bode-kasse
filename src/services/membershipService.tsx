import type { Membership, Role } from "../types/domain";
import { upsertMembership } from "../lib/firestore";

export async function changeMemberRole(
  membership: Membership,
  newRole: Role,
  actorId: string,
): Promise<Membership> {
  const updatedMembership: Membership = {
    ...membership,
    role: newRole,
  };

  await upsertMembership(
    updatedMembership,
    actorId,
    "member.roleChanged",
  );

  return updatedMembership;
}