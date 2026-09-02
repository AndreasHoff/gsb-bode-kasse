import { useState } from "react";
import {
  collection,
  addDoc,
  writeBatch,
  getFirestore,
  doc,
} from "firebase/firestore";
import type { FineRuleProposal } from "../../types/domain";

interface ProposalFormData {
  title: string;
  description?: string;
  amount: number;
  emoji?: string;
}

interface UseProposalSubmitResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  submit: (
    teamId: string,
    seasonId: string,
    userId: string,
    userName: string,
    data: ProposalFormData,
  ) => Promise<string>; // Returns proposal ID on success
}

export function useProposalSubmit(): UseProposalSubmitResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (
    teamId: string,
    seasonId: string,
    userId: string,
    userName: string,
    data: ProposalFormData,
  ): Promise<string> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const db = getFirestore();
      const batch = writeBatch(db);

      // Create proposal document in teams/{teamId}/fineRuleProposals/{proposalId}
      const proposalRef = doc(
        collection(db, "teams", teamId, "fineRuleProposals")
      );
      const proposal: Omit<FineRuleProposal, "id"> = {
        teamId,
        seasonId,
        title: data.title.trim(),
        description: data.description?.trim(),
        amount: data.amount,
        emoji: data.emoji?.trim(),
        status: "pending",
        proposedBy: userId,
        proposedByName: userName,
        createdAt: new Date().toISOString(),
      };

      batch.set(proposalRef, proposal);

      // Create ActivityLog entry in teams/{teamId}/activityLog/{entryId}
      const activityLogRef = doc(collection(db, "teams", teamId, "activityLog"));
      batch.set(activityLogRef, {
        teamId,
        actorId: userId,
        action: "rule.proposal_created",
        entityType: "fine_rule_proposal",
        entityId: proposalRef.id,
        metadata: {
          proposedByName: userName,
          proposalTitle: data.title,
        },
        createdAt: new Date().toISOString(),
      });

      await batch.commit();
      setSuccess(true);

      return proposalRef.id;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Kunne ikke gemme forslaget. Prøv igen.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, success, submit };
}
