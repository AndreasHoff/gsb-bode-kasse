// Feature: Member Fine Rule Proposals (F026)
// Admin view: Approve or deny a single proposal

import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";
import type { FineRuleProposal } from "../../types/domain";
import { useProposalApproval } from "./useProposalApproval";
import { formatAmount, formatRelativeTime } from "../../lib/utils";

interface Props {
  teamId: string;
  proposalId: string;
  adminId: string;
  onBack: () => void;
  onProcessed?: () => void;
}

export default function AdminProposalDetail({
  teamId,
  proposalId,
  adminId,
  onBack,
  onProcessed,
}: Props) {
  const [proposal, setProposal] = useState<FineRuleProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);

  const { loading: isProcessing, error: processError, approveProposal, denyProposal } = useProposalApproval();

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

  const handleApprove = async () => {
    if (!proposal) return;

    try {
      await approveProposal(teamId, proposalId, adminId);
      setShowApproveConfirm(false);
      onProcessed?.();
      onBack();
    } catch {
      // Error is handled by hook
    }
  };

  const handleDeny = async () => {
    if (!proposal) return;

    try {
      await denyProposal(teamId, proposalId, adminId);
      setShowDenyConfirm(false);
      onProcessed?.();
      onBack();
    } catch {
      // Error is handled by hook
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
        <p className="app-subtitle">
          Forslået af <strong>{proposal.proposedByName}</strong> · {formatRelativeTime(proposal.createdAt)}
        </p>
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

          {proposal.description && (
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
                Beskrivelse
              </p>
              <p className="text-sm text-[var(--color-text)]">{proposal.description}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">
              Forslået af
            </p>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {proposal.proposedByName}
            </p>
          </div>
        </div>
      </div>

      {processError && <p className="status-error mb-4">{processError}</p>}

      <div className="space-y-2">
        <button
          type="button"
          className="btn-primary w-full py-3 rounded-2xl"
          onClick={() => setShowApproveConfirm(true)}
          disabled={isProcessing}
        >
          {isProcessing ? "Behandler..." : "✅ Godkend"}
        </button>

        <button
          type="button"
          className="w-full py-3 rounded-2xl border border-red-500 text-red-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowDenyConfirm(true)}
          disabled={isProcessing}
          aria-label="Afvis forslag"
        >
          {isProcessing ? "Behandler..." : "❌ Afvis"}
        </button>
      </div>

      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-lg mb-2">Godkende forslag?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              "{proposal.title}" vil blive oprettet som en ny bødetype.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-text-muted)]"
                onClick={() => setShowApproveConfirm(false)}
                disabled={isProcessing}
              >
                Annuller
              </button>
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl bg-green-500 text-white font-semibold"
                onClick={() => void handleApprove()}
                disabled={isProcessing}
              >
                {isProcessing ? "Godkender..." : "Godkend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDenyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-lg mb-2">Afvise forslag?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              "{proposal.title}" vil blive slettet permanent. {proposal.proposedByName} får ikke besked.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-text-muted)]"
                onClick={() => setShowDenyConfirm(false)}
                disabled={isProcessing}
              >
                Annuller
              </button>
              <button
                type="button"
                className="flex-1 py-2 px-3 rounded-xl bg-red-500 text-white font-semibold"
                onClick={() => void handleDeny()}
                disabled={isProcessing}
              >
                {isProcessing ? "Afviser..." : "Afvis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
