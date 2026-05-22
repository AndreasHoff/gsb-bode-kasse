import { useEffect, useState } from "react";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";
import { auth } from "../../lib/firebase";
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
import { ProposalDetailSection } from "./proposal-layout.tsx";
import { canExportAndManageProposalStatus } from "../../lib/permissions";

interface Props {
  proposalId: string;
  onEdit: (id: string) => void;
  onBack: () => void;
}

export default function ProposalDetail({
  proposalId,
  onEdit,
  onBack,
}: Props) {
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
    if (
      !proposal ||
      status === proposal.status ||
      !canExportAndManageProposalStatus(auth.currentUser?.email)
    ) {
      return;
    }
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
    if (!proposal || !canExportAndManageProposalStatus(auth.currentUser?.email)) {
      return;
    }
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
    if (!proposal || !canExportAndManageProposalStatus(auth.currentUser?.email)) {
      return;
    }
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
  const canManageProposalLifecycle = canExportAndManageProposalStatus(
    auth.currentUser?.email,
  );

  return (
    <div className="app-page proposal-detail-page pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          className="btn-secondary px-3 py-2 text-sm shrink-0 rounded-2xl"
          onClick={onBack}
        >
          ← Tilbage
        </button>
        {!isLocked && (
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-sm ml-auto rounded-2xl"
            onClick={() => onEdit(proposal.id)}
          >
            Rediger
          </button>
        )}
      </div>

      <div className="proposal-detail-hero">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={proposal.status} />
          {proposal.priority !== undefined && (
            <PriorityBadge priority={proposal.priority} />
          )}
        </div>
        <h1 className="app-title leading-tight">{proposal.title}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[var(--color-text-muted)]">
          <span>
            Oprettet {formatRelativeTime(proposal.createdAt)} af {proposal.creatorName || "Ukendt bruger"}
          </span>
          {proposal.statusUpdatedAt && (
            <span>
              Status opdateret {formatRelativeTime(proposal.statusUpdatedAt)}
            </span>
          )}
        </div>
      </div>

      {proposal.githubIssueUrl ? (
        <a
          href={proposal.githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] mb-6"
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
          className="btn-secondary w-full mb-6 text-sm rounded-2xl disabled:pointer-events-none"
          onClick={() => {
            void handleExportToGithub();
          }}
          disabled={exporting || !canManageProposalLifecycle}
          title={
            canManageProposalLifecycle
              ? undefined
              : "Kun mchoffn@hotmail.com kan eksportere til GitHub"
          }
        >
          {exporting ? "Eksporterer..." : "Eksportér til GitHub"}
        </button>
      )}

      <div
        className={`app-card app-card--muted proposal-status-control mb-6 ${
          !canManageProposalLifecycle ? "opacity-45 saturate-50" : ""
        }`}
      >
        <label htmlFor="proposal-status-select" className="proposal-status-control__label">
          Status:
          {!canManageProposalLifecycle && (
            <span className="ml-2 inline-flex items-center rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              Låst
            </span>
          )}
        </label>
        <select
          id="proposal-status-select"
          className="proposal-status-control__select disabled:cursor-not-allowed disabled:opacity-60"
          value={proposal.status}
          onChange={(e) => {
            void handleStatusChange(e.target.value as ProposalStatus);
          }}
          disabled={changingStatus || !canManageProposalLifecycle}
          title={
            canManageProposalLifecycle
              ? undefined
              : "Kun mchoffn@hotmail.com kan ændre status"
          }
        >
          {ALL_PROPOSAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {proposal.status === "implemented" && (
        <button
          type="button"
          className="btn-primary w-full mb-6 rounded-2xl"
          onClick={() => {
            void handleApprove();
          }}
          disabled={approving || !canManageProposalLifecycle}
          title={
            canManageProposalLifecycle
              ? undefined
              : "Kun mchoffn@hotmail.com kan godkende som færdig"
          }
        >
          {approving ? "Godkender..." : "✓ Godkend som færdig"}
        </button>
      )}

      {actionError && <p className="status-error mb-6">{actionError}</p>}

      <div className="proposal-detail-stack">
        <ProposalDetailSection title="Hvad er problemet?">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{proposal.problem}</p>
        </ProposalDetailSection>
        <ProposalDetailSection title="Hvad bør ske i stedet?">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {proposal.desiredOutcome}
          </p>
        </ProposalDetailSection>
        {proposal.whereInApp && (
          <ProposalDetailSection title="Hvor i appen?">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {proposal.whereInApp}
            </p>
          </ProposalDetailSection>
        )}
      </div>
    </div>
  );
}
