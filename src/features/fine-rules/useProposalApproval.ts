import { useState } from "react";
import {
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
  collection,
  getFirestore,
} from "firebase/firestore";
import type { FineRuleProposal } from "../../types/domain";

interface UseProposalApprovalResult {
  loading: boolean;
  error: string | null;
  approveProposal: (
    teamId: string,
    proposalId: string,
    adminId: string,
  ) => Promise<string>; // Returns new ruleId
  denyProposal: (teamId: string, proposalId: string, adminId: string) => Promise<void>;
}

export function useProposalApproval(): UseProposalApprovalResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveProposal = async (
    teamId: string,
    proposalId: string,
    adminId: string,
  ): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();

      // Get the proposal from teams/{teamId}/fineRuleProposals/{proposalId}
      const proposalSnap = await getDoc(
        doc(db, "teams", teamId, "fineRuleProposals", proposalId)
      );
      if (!proposalSnap.exists()) {
        throw new Error("Forslag blev ikke fundet");
      }

      const proposal = proposalSnap.data() as FineRuleProposal;

      const batch = writeBatch(db);

      // Create new FineRule in teams/{teamId}/fineRules/{ruleId}
      const ruleRef = doc(collection(db, "teams", teamId, "fineRules"));
      batch.set(ruleRef, {
        teamId: proposal.teamId,
        title: proposal.title,
        description: proposal.description || null,
        amount: proposal.amount,
        emoji: proposal.emoji || null,
        isActive: true,
        createdBy: adminId,
        createdAt: new Date().toISOString(),
      });

      // Create ActivityLog entry in teams/{teamId}/activityLog/{entryId}
      const activityLogRef = doc(collection(db, "teams", teamId, "activityLog"));
      batch.set(activityLogRef, {
        teamId: proposal.teamId,
        actorId: adminId,
        action: "rule.proposed_approved",
        entityType: "fine_rule_proposal",
        entityId: proposalId,
        metadata: {
          proposedByName: proposal.proposedByName,
          ruleId: ruleRef.id,
        },
        createdAt: new Date().toISOString(),
      });

      // Delete the proposal from teams/{teamId}/fineRuleProposals/{proposalId}
      batch.delete(doc(db, "teams", teamId, "fineRuleProposals", proposalId));

      await batch.commit();

      return ruleRef.id;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Kunne ikke godkende forslaget. Prøv igen.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const denyProposal = async (
    teamId: string,
    proposalId: string,
    adminId: string,
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();

      // Get the proposal first to get metadata
      const proposalSnap = await getDoc(
        doc(db, "teams", teamId, "fineRuleProposals", proposalId)
      );
      if (!proposalSnap.exists()) {
        throw new Error("Forslag blev ikke fundet");
      }

      const proposal = proposalSnap.data() as FineRuleProposal;

      const batch = writeBatch(db);

      // Create ActivityLog entry in teams/{teamId}/activityLog/{entryId}
      const activityLogRef = doc(collection(db, "teams", teamId, "activityLog"));
      batch.set(activityLogRef, {
        teamId: proposal.teamId,
        actorId: adminId,
        action: "rule.proposed_denied",
        entityType: "fine_rule_proposal",
        entityId: proposalId,
        metadata: {
          proposedByName: proposal.proposedByName,
        },
        createdAt: new Date().toISOString(),
      });

      // Delete the proposal from teams/{teamId}/fineRuleProposals/{proposalId}
      batch.delete(doc(db, "teams", teamId, "fineRuleProposals", proposalId));

      await batch.commit();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Kunne ikke afvise forslaget. Prøv igen.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, approveProposal, denyProposal };
}
