import { collection, doc } from "firebase/firestore";
import { db } from "../firebase";
import {
  userConverter,
  teamConverter,
  membershipConverter,
  seasonConverter,
  fineRuleConverter,
  fineConverter,
  paymentConverter,
  activityLogConverter,
  featureProposalConverter,
  userSeasonBalanceConverter,
} from "./converters";
// ---------------------------------------------------------------------------
// Top-level collections
// Return types are inferred from withConverter() to preserve both AppModelType
// and DbModelType generics, avoiding a CollectionReference<T> vs
// CollectionReference<T, TDoc> mismatch.
// ---------------------------------------------------------------------------

export const usersCol = () =>
  collection(db, "users").withConverter(userConverter);

export const userDoc = (userId: string) =>
  doc(db, "users", userId).withConverter(userConverter);

export const teamsCol = () =>
  collection(db, "teams").withConverter(teamConverter);

export const teamDoc = (teamId: string) =>
  doc(db, "teams", teamId).withConverter(teamConverter);

export const proposalsCol = () =>
  collection(db, "featureProposals").withConverter(featureProposalConverter);

export const proposalDoc = (proposalId: string) =>
  doc(db, "featureProposals", proposalId).withConverter(featureProposalConverter);

// ---------------------------------------------------------------------------
// Sub-collections under teams/{teamId}
// ---------------------------------------------------------------------------

export const membersCol = (teamId: string) =>
  collection(db, "teams", teamId, "members").withConverter(membershipConverter);

export const memberDoc = (teamId: string, membershipId: string) =>
  doc(db, "teams", teamId, "members", membershipId).withConverter(membershipConverter);

export const seasonsCol = (teamId: string) =>
  collection(db, "teams", teamId, "seasons").withConverter(seasonConverter);

export const seasonDoc = (teamId: string, seasonId: string) =>
  doc(db, "teams", teamId, "seasons", seasonId).withConverter(seasonConverter);

export const userSeasonBalancesCol = (teamId: string) =>
  collection(db, "teams", teamId, "userSeasonBalances").withConverter(
    userSeasonBalanceConverter,
  );

export const userSeasonBalanceDoc = (teamId: string, balanceId: string) =>
  doc(db, "teams", teamId, "userSeasonBalances", balanceId).withConverter(
    userSeasonBalanceConverter,
  );

export const fineRulesCol = (teamId: string) =>
  collection(db, "teams", teamId, "fineRules").withConverter(fineRuleConverter);

export const fineRuleDoc = (teamId: string, ruleId: string) =>
  doc(db, "teams", teamId, "fineRules", ruleId).withConverter(fineRuleConverter);

export const finesCol = (teamId: string) =>
  collection(db, "teams", teamId, "fines").withConverter(fineConverter);

export const fineDoc = (teamId: string, fineId: string) =>
  doc(db, "teams", teamId, "fines", fineId).withConverter(fineConverter);

export const paymentsCol = (teamId: string) =>
  collection(db, "teams", teamId, "payments").withConverter(paymentConverter);

export const paymentDoc = (teamId: string, paymentId: string) =>
  doc(db, "teams", teamId, "payments", paymentId).withConverter(paymentConverter);

// activityLog is append-only — never update or delete entries
export const activityLogCol = (teamId: string) =>
  collection(db, "teams", teamId, "activityLog").withConverter(activityLogConverter);
