// Feature: Member Fine Rule Proposals (F026)
// Shows member's own fine rule proposals

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import type { FineRuleProposal } from "../../types/domain";
import { formatAmount, formatRelativeTime } from "../../lib/utils";

interface Props {
  teamId: string;
  userId: string;
  onSelectProposal: (proposalId: string) => void;
  onBack: () => void;
}

export default function MyProposals({
  teamId,
  userId,
  onSelectProposal,
  onBack,
}: Props) {
  const [proposals, setProposals] = useState<FineRuleProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "teams", teamId, "fineRuleProposals"),
      where("proposedBy", "==", userId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as FineRuleProposal));
        // Sort by createdAt descending (newest first)
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProposals(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading proposals:", err);
        setError("Kunne ikke hente forslag");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [teamId, userId]);

  const getStatusBadgeClass = (status: FineRuleProposal["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-900";
      case "approved":
        return "bg-green-100 text-green-900";
      case "denied":
        return "bg-gray-100 text-gray-900";
      default:
        return "bg-gray-100 text-gray-900";
    }
  };

  const getStatusText = (status: FineRuleProposal["status"]) => {
    switch (status) {
      case "pending":
        return "Afventer godkendelse";
      case "approved":
        return "Godkendt";
      case "denied":
        return "Afvist";
      default:
        return status;
    }
  };

  return (
    <div className="app-page pb-8">
      <button
        type="button"
        className="mb-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        onClick={onBack}
      >
        ← Tilbage
      </button>

      <div className="mb-6">
        <h1 className="app-title">Mine forslag</h1>
        <p className="app-subtitle">
          {loading ? "Henter..." : `${proposals.length} forslag`}
        </p>
      </div>

      {error && <p className="status-error mb-4">{error}</p>}

      {loading && <p className="status-note">Henter forslag...</p>}

      {!loading && proposals.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__emoji">💡</span>
          <p className="empty-state__text">Du har ingen forslag endnu.</p>
        </div>
      )}

      {!loading && proposals.length > 0 && (
        <div className="item-list">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onSelect={() => onSelectProposal(proposal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  proposal: FineRuleProposal;
  onSelect: () => void;
}

function ProposalCard({ proposal, onSelect }: CardProps) {
  const getStatusBadgeClass = (status: FineRuleProposal["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-900";
      case "approved":
        return "bg-green-100 text-green-900";
      case "denied":
        return "bg-gray-100 text-gray-900";
      default:
        return "bg-gray-100 text-gray-900";
    }
  };

  const getStatusText = (status: FineRuleProposal["status"]) => {
    switch (status) {
      case "pending":
        return "Afventer godkendelse";
      case "approved":
        return "Godkendt";
      case "denied":
        return "Afvist";
      default:
        return status;
    }
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="app-card p-4 w-full text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {proposal.emoji && (
              <span className="text-lg shrink-0" aria-hidden="true">
                {proposal.emoji}
              </span>
            )}
            <p className="text-sm font-semibold truncate">{proposal.title}</p>
          </div>
          {proposal.description && (
            <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">
              {proposal.description}
            </p>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatRelativeTime(proposal.createdAt)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-sm font-bold text-[var(--color-primary-contrast)] bg-[var(--color-primary)] px-2.5 py-1 rounded-xl">
            {formatAmount(proposal.amount)}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${getStatusBadgeClass(proposal.status)}`}>
            {getStatusText(proposal.status)}
          </span>
        </div>
      </div>
    </button>
  );
}
