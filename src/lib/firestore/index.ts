// Public API for the Firestore data access layer.
// Features import from here — never path-walk into subfiles.

export type { ActivityLogAction, LogActivityInput, ActivityLogCursor } from "./activityLog";
export { logActivity, getActivityLogEntries } from "./activityLog";

export { getTeam, createTeam, getTeams } from "./teams";

export { getUserProfile, getUsers, ensureUserProfile, updateUserProfile } from "./users";

export {
  getMemberships,
  getMembership,
  getActiveMembershipsForUser,
  backfillTeamMembershipsForAllUsers,
  upsertMembership,
  removeMember,
} from "./members";

export {
  getSeasons,
  getActiveSeason,
  getSeason,
  createSeason,
  closeSeason,
} from "./seasons";

export {
  getFineRules,
  getFineRule,
  createFineRule,
  updateFineRule,
  deactivateFineRule,
  bulkCreateFineRules,
} from "./fineRules";

export {
  getFines,
  getFinesForUser,
  getFine,
  assignFine,
  assignFineWithPayment,
  softDeleteFine,
  restoreFine,
  bulkSoftDeleteFines,
  bulkRestoreFines,
} from "./fines";

export {
  getPayments,
  getPaymentsForUser,
  getPayment,
  createPayment,
  initiatePayment,
  approvePayment,
  disputePayment,
  getApprovedPayments,
  getPaymentsForReconciliation,
  refundPayment,
  reconcilePayment,
} from "./payments";

export type { CreateProposalInput, UpdateProposalInput } from "./proposals";
export {
  getProposals,
  getProposal,
  createProposal,
  updateProposal,
  updateProposalStatus,
  approveProposal,
} from "./proposals";
