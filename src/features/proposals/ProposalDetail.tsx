import { useEffect, useState } from "react";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";
import {
  getProposal,
  updateProposalStatus,
  approveProposal,
} from "../../lib/firestore";
import { callExportProposalToGithub } from "../../lib/functions";
import { formatRelativeTime } from "../../lib/utils";
import {
  STATUS_LABELS,
  ALL_PROPOSAL_STATUSES,
  LOCKED_STATUSES,
  PriorityBadge,
  StatusBadge,
} from "./proposal-utils";

interface Props {
  proposalId: string;
  onEdit: (id: string) => void;
  onBack: () => void;
}

export default function ProposalDetail({ proposalId, onEdit, onBack }: Props) {
  const [proposal, setProposal] = useState<FeatureProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setProposal(null);
    void getProposal(proposalId)
      .then(setProposal)
      .catch(() => setError("Kunne ikke hente forslaget"))
      .finally(() => setLoading(false));
  }, [proposalId]);

  async function handleStatusChange(status: ProposalStatus) {
    if (!proposal || status === proposal.status) return;
    setChangingStatus(true);
    setActionError(null);
    try {
      const updated = await updateProposalStatus(proposal.id, status);
      setProposal(updated);
    } catch {
      setActionError("Kunne ikke opdatere status");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleApprove() {
    if (!proposal) return;
    setApproving(true);
    setActionError(null);
    try {
      const updated = await approveProposal(proposal.id);
      setProposal(updated);
    } catch {
      setActionError("Kunne ikke godkende forslaget");
    } finally {
      setApproving(false);
    }
  }

  async function handleExportToGithub() {
    if (!proposal) return;
    setExporting(true);
    setActionError(null);
    try {
      const result = await callExportProposalToGithub(proposal.id);
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              githubIssueNumber: result.issueNumber,
              githubIssueUrl: result.issueUrl,
              exportedToGithubAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke eksportere til GitHub",
      );
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="app-page">
        <p className="status-note text-center py-8">Henter forslag...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="app-page">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-sm mb-4"
          onClick={onBack}
        >
          ← Tilbage
        </button>
        <p className="status-error">{error ?? "Forslaget blev ikke fundet"}</p>
      </div>
    );
  }

  const isLocked = LOCKED_STATUSES.includes(proposal.status);

  return (
    <div className="app-page">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-sm shrink-0"
          onClick={onBack}
        >
          ← Tilbage
        </button>
        {!isLocked && (
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-sm ml-auto"
            onClick={() => onEdit(proposal.id)}
          >
            Rediger
          </button>
        )}
      </div>

      {/* Title + status */}
      <div className="mb-5">
        <div className="flex items-start gap-2 mb-2">
          <h1 className="app-title flex-1 leading-snug">{proposal.title}</h1>
          <StatusBadge status={proposal.status} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {proposal.priority !== undefined && (
            <PriorityBadge priority={proposal.priority} withPrefix={true} />
          )}
          <span className="text-xs text-[var(--color-text-muted)]">
            Oprettet {formatRelativeTime(proposal.createdAt)}
          </span>
          {proposal.statusUpdatedAt && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Status opdateret {formatRelativeTime(proposal.statusUpdatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Content sections */}
      <div className="flex flex-col gap-4 mb-6">
        <DetailSection label="Hvad er problemet?" content={proposal.problem} />
        <DetailSection
          label="Hvad bør ske i stedet?"
          content={proposal.desiredOutcome}
        />
        {proposal.whereInApp && (
          <DetailSection label="Hvor i appen?" content={proposal.whereInApp} />
        )}
      </div>

      {/* GitHub link or export button */}
      {proposal.githubIssueUrl ? (
        <a
          href={proposal.githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] mb-6"
        >
          <span>GitHub #{proposal.githubIssueNumber}</span>
          {proposal.exportedToGithubAt && (
            <span className="text-xs text-[var(--color-text-muted)] font-normal">
              ({formatRelativeTime(proposal.exportedToGithubAt)})
            </span>
          )}
          <span>↗</span>
        </a>
      ) : (
        <button
          type="button"
          className="btn-secondary w-full mb-5 text-sm"
          onClick={() => {
            void handleExportToGithub();
          }}
          disabled={exporting}
        >
          {exporting ? "Eksporterer..." : "Eksporter til GitHub"}
        </button>
      )}

      {/* Status control */}
      <div className="mb-4">
        <label className="field">
          <span className="field__label text-xs uppercase tracking-wide font-bold text-[var(--color-text-muted)]">
            Skift status
          </span>
          <select
            className="field__input text-sm"
            value={proposal.status}
            onChange={(e) => {
              void handleStatusChange(e.target.value as ProposalStatus);
            }}
            disabled={changingStatus}
          >
            {ALL_PROPOSAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Approve button */}
      {proposal.status === "implemented" && (
        <button
          type="button"
          className="btn-primary w-full mb-4"
          onClick={() => {
            void handleApprove();
          }}
          disabled={approving}
        >
          {approving ? "Godkender..." : "✓ Godkend som færdig"}
        </button>
      )}

      {actionError && <p className="status-error mt-2">{actionError}</p>}
    </div>
  );
}

function DetailSection({ label, content }: { label: string; content: string }) {
  return (
    <div className="app-card app-card--muted p-4">
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
