import { useState } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  getFirestore,
} from "firebase/firestore";

interface UseProposalEditResult {
  loading: boolean;
  error: string | null;
  updateProposal: (
    teamId: string,
    proposalId: string,
    data: {
      title: string;
      description?: string;
      amount: number;
      emoji?: string;
    },
  ) => Promise<void>;
  retractProposal: (teamId: string, proposalId: string) => Promise<void>;
}

export function useProposalEdit(): UseProposalEditResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProposal = async (
    teamId: string,
    proposalId: string,
    data: {
      title: string;
      description?: string;
      amount: number;
      emoji?: string;
    },
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();
      const proposalRef = doc(db, "teams", teamId, "fineRuleProposals", proposalId);

      await updateDoc(proposalRef, {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        amount: data.amount,
        emoji: data.emoji?.trim() || null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Kunne ikke opdatere forslaget. Prøv igen.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const retractProposal = async (
    teamId: string,
    proposalId: string,
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore();
      const proposalRef = doc(db, "teams", teamId, "fineRuleProposals", proposalId);
      await deleteDoc(proposalRef);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Kunne ikke slette forslaget. Prøv igen.";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, updateProposal, retractProposal };
}
