import { useEffect, useState } from "react";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";
import { getProposals } from "../../lib/firestore";
import { formatRelativeTime } from "../../lib/utils";
import {
  STATUS_LABELS,
  ALL_PROPOSAL_STATUSES,
  PriorityBadge,
  StatusBadge,
} from "./proposal-utils";

type FilterTab = "all" | ProposalStatus;

interface Props {
  onNew: () => void;
  onSelect: (id: string) => void;
}

export default function ProposalList({ onNew, onSelect }: Props) {
  const [proposals, setProposals] = useState<FeatureProposal[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getProposals()
      .then(setProposals)
      .catch(() => setError("Kunne ikke hente forslag"))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? proposals : proposals.filter((p) => p.status === filter);

  return (
    <div className="app-page">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="app-title">Idéforslag</h1>
          <p className="app-subtitle">{proposals.length} forslag i alt</p>
        </div>
        <button
          type="button"
          className="btn-primary px-4 py-2 text-sm"
          onClick={onNew}
        >
          + Nyt
        </button>
      </div>

      {/* Filter tabs */}
      <div className="overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        <div className="flex gap-1.5 min-w-max">
          <FilterButton
            label="Alle"
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {ALL_PROPOSAL_STATUSES.map((s) => (
            <FilterButton
              key={s}
              label={STATUS_LABELS[s]}
              active={filter === s}
              onClick={() => setFilter(s)}
            />
          ))}
        </div>
      </div>

      {loading && (
        <p className="status-note text-center py-8">Henter forslag...</p>
      )}
      {error && <p className="status-error py-4">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p className="text-4xl mb-3">💡</p>
          <p className="text-sm">Ingen forslag her endnu.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((proposal) => (
          <button
            key={proposal.id}
            type="button"
            onClick={() => onSelect(proposal.id)}
            className="app-card w-full text-left p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-sm leading-snug flex-1">
                {proposal.title}
              </p>
              <StatusBadge status={proposal.status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {proposal.priority !== undefined && (
                <PriorityBadge priority={proposal.priority} />
              )}
              {proposal.githubIssueNumber !== undefined && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  #{proposal.githubIssueNumber}
                </span>
              )}
              <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                {formatRelativeTime(proposal.createdAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] border-[var(--color-primary)]"
          : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]"
      }`}
    >
      {label}
    </button>
  );
}
