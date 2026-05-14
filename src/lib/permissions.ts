import type { Role } from "../types/domain";

function isAdminRole(role: Role): boolean {
  return role === "admin";
}

/** Returns true if the given role can assign fines */
export function canAssignFines(role: Role): boolean {
  return isAdminRole(role);
}

/** Returns true if the given role can approve payments */
export function canApprovePayments(role: Role): boolean {
  return isAdminRole(role);
}

/** Returns true if the given role can delete fines */
export function canDeleteFines(role: Role): boolean {
  return isAdminRole(role);
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
export function canManageFineRules(role: Role): boolean {
  return isAdminRole(role);
}
