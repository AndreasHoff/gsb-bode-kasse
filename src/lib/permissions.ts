import type { Role } from "../types/domain";

const PROPOSAL_OWNER_EMAIL = "mchoffn@hotmail.com";

function isAdminRole(role: Role | null): boolean {
  return role === "admin";
}

function hasFineAccess(role: Role | null, isSuperAdmin?: boolean): boolean {
  return isSuperAdmin === true || isAdminRole(role);
}

/** Returns true if the given role can assign fines */
export function canAssignFines(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasFineAccess(role, isSuperAdmin);
}

/** Returns true if the given role can approve payments */
export function canApprovePayments(role: Role): boolean {
  return isAdminRole(role);
}

/** Returns true if the given role can delete fines */
export function canDeleteFines(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasFineAccess(role, isSuperAdmin);
}

/** Returns true if the given role can manage team members */
export function canManageMembers(role: Role): boolean {
  return isAdminRole(role);
}

/** Returns true if the given role can manage seasons */
export function canManageSeasons(role: Role): boolean {
  return isAdminRole(role);
}

/** Returns true if the given role can view the activity log */
export function canViewActivityLog(role: Role): boolean {
  return isAdminRole(role);
}

/** Returns true if the given role can manage fine rules */
export function canManageFineRules(role: Role | null, isSuperAdmin?: boolean): boolean {
  return hasFineAccess(role, isSuperAdmin);
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
