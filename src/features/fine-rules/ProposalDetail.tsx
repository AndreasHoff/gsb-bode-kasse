// Feature: Member Fine Rule Proposals (F026)
// Detailed view of a single proposal with edit/retract capabilities

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";
import type { FineRuleProposal } from "../../types/domain";
import { useProposalEdit } from "./useProposalEdit";
import ProposalForm from "./ProposalForm";
import { formatAmount, formatRelativeTime } from "../../lib/utils";

interface Props {
  teamId: string;
  seasonId: string;
  proposalId: string;
  userId: string;
  userName: string;
  onBack: () => void;
  onDeleted?: () => void;
}

export default function ProposalDetail({
  teamId,
  seasonId,
  proposalId,
  userId,
  userName,
  onBack,
  onDeleted,
}: Props) {
  const [proposal, setProposal] = useState<FineRuleProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { loading: isRetractingProposal, error: retractError, retractProposal } = useProposalEdit();

  useEffect(() => {
    const loadProposal = async () => {
      try {
        setLoading(true);
        setError(null);
        const db = getFirestore();
        const docSnap = await getDoc(doc(db, "teams", teamId, "fineRuleProposals", proposalId));

        if (docSnap.exists()) {
          setProposal({
            id: docSnap.id,
            ...docSnap.data(),
          } as FineRuleProposal);
        } else {
          setError("Forslag blev ikke fundet");
        }
      } catch (err) {
        setError("Kunne ikke hente forslaget");
        console.error("Error loading proposal:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadProposal();
  }, [proposalId]);

  const canEdit = proposal?.status === "pending";

  const handleRetract = async () => {
    if (!proposal) return;
    if (!window.confirm("Er du sikker på, at du vil slette dette forslag?")) return;

    try {
      await retractProposal(teamId, proposalId);
      setShowDeleteConfirm(false);
      onDeleted?.();
      onBack();
    } catch {
      // Error is handled by hook
    }
  };

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

  if (loading) {
    return (
      <div className="app-page">
        <p className="status-note text-center py-8">Henter forslag...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="app-page">
        <p className="status-error text-center py-8">{error || "Forslag blev ikke fundet"}</p>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={onBack}
        >
          Tilbage
        </button>
      </div>
    );
  }

  if (isEditing && canEdit) {
    return (
      <ProposalForm
        teamId={teamId}
        seasonId={seasonId}
        userId={userId}
        userName={userName}
        onSave={() => {
          setIsEditing(false);
          onBack();
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

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
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="app-title">{proposal.title}</h1>
          {proposal.emoji && (
            <span className="text-4xl" aria-hidden="true">
              {proposal.emoji}
            </span>
          )}
        </div>
        <p className="app-subtitle">Forslag sendt {formatRelativeTime(proposal.createdAt)}</p>
      </div>

      <div className="app-card p-4 mb-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
              Beløb
            </p>
            <p className="text-lg font-bold text-[var(--color-primary)]">
              {formatAmount(proposal.amount)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
              Status
            </p>
            <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-lg ${getStatusBadgeClass(proposal.status)}`}>
              {getStatusText(proposal.status)}
            </span>
          </div>

          {proposal.description && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                Beskrivelse
              </p>
              <p className="text-sm text-[var(--color-text)]">{proposal.description}</p>
            </div>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="space-y-2">
          <button
            type="button"
            className="btn-primary w-full py-3 rounded-2xl"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Rediger forslag
          </button>

          <button
            type="button"
            className="w-full py-3 rounded-2xl border border-red-500 text-red-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isRetractingProposal}
            aria-label="Slet forslag"
          >
            {isRetractingProposal ? "Sletter..." : "🗑️ Slet forslag"}
          </button>
        </div>
      )}

      {!canEdit && (
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {proposal.status === "approved" && "Dette forslag er godkendt og kan ikke redigeres."}
            {proposal.status === "denied" && "Dette forslag blev afvist og kan ikke redigeres."}
          </p>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-lg mb-2">Slet forslag?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Er du sikker på, at du vil slette "{proposal.title}"? Dette kan ikke fortrydes.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-text-muted)]"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuller
              </button>
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl bg-red-500 text-white font-semibold"
                onClick={() => void handleRetract()}
                disabled={isRetractingProposal}
              >
                {isRetractingProposal ? "Sletter..." : "Slet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {retractError && (
        <p className="status-error mt-4">{retractError}</p>
      )}
    </div>
  );
}
