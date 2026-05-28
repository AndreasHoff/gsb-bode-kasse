import type { Role } from "../types/domain";

const PROPOSAL_OWNER_EMAIL = (
  import.meta.env.VITE_PROPOSAL_OWNER_EMAIL ?? "mchoffn@hotmail.com"
)
  .trim()
  .toLowerCase();

function isAdminRole(role: Role | null): boolean {
  return role === "admin";
}

function hasAdminAccess(role: Role | null, isSuperAdmin?: boolean): boolean {
  return isSuperAdmin === true || isAdminRole(role);
}

/** Returns true if the given role can assign fines */
export function canAssignFines(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the given role can approve payments */
export function canApprovePayments(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the given role can delete fines */
export function canDeleteFines(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the given role can manage team members */
export function canManageMembers(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the given role can manage seasons */
export function canManageSeasons(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the given role can view the activity log */
export function canViewActivityLog(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the given role can manage fine rules */
export function canManageFineRules(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasAdminAccess(role, isSuperAdmin);
}

/** Returns true if the user is a super-admin (can manage feature proposals) */
export function canManageProposals(isSuperAdmin: boolean | undefined): boolean {
  return isSuperAdmin === true;
}

/** Returns true only for the designated proposal owner email. */
export function canExportAndManageProposalStatus(
  email: string | null | undefined,
): boolean {
  return email?.trim().toLowerCase() === PROPOSAL_OWNER_EMAIL;
}
