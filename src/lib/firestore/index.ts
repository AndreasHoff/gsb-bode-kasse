// Public API for the Firestore data access layer.
// Features import from here — never path-walk into subfiles.

export type { ActivityLogAction, LogActivityInput } from "./activityLog";
export { logActivity } from "./activityLog";

export { getTeam, createTeam, getTeams } from "./teams";

export { getUserProfile, getUsers, ensureUserProfile, updateUserProfile } from "./users";

export {
  getMemberships,
  getMembership,
  getActiveMembershipsForUser,
  backfillTeamMembershipsForAllUsers,
  upsertMembership,
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
} from "./fineRules";

export {
  getFines,
  getFinesForUser,
  getFine,
  assignFine,
  softDeleteFine,
  restoreFine,
} from "./fines";

export {
  getPayments,
  getPaymentsForUser,
  getPayment,
  createPayment,
  initiatePayment,
  approvePayment,
  disputePayment,
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
