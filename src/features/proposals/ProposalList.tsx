import { useEffect, useState } from "react";
import type { FeatureProposal, ProposalStatus } from "../../types/domain";
import { getProposals } from "../../lib/firestore";
import {
  STATUS_LABELS,
  ALL_PROPOSAL_STATUSES,
} from "./proposal-utils";
import {
  ProposalCard,
  ProposalCardStack,
  ProposalFilterPill,
  ProposalPageHeader,
} from "./proposal-layout.tsx";

type FilterTab = "all" | ProposalStatus;

interface Props {
  onNew: () => void;
  onSelect: (id: string) => void;
}

export default function ProposalList({ onNew, onSelect }: Props) {
  const [proposals, setProposals] = useState<FeatureProposal[]>([]);
  const [filter, setFilter] = useState<FilterTab>("new");
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

  const filterCounts = proposals.reduce(
    (counts, proposal) => {
      counts.all += 1;
      counts[proposal.status] += 1;
      return counts;
    },
    {
      all: 0,
      new: 0,
      triaged: 0,
      planned: 0,
      implemented: 0,
      done: 0,
      abandoned: 0,
    } as Record<FilterTab, number>,
  );

  return (
    <div className="app-page pb-8">
      <ProposalPageHeader
        eyebrow="Feature forslag"
        title="Feature Ideer"
        subtitle={`${filtered.length} af ${proposals.length} idéer`}
        action={
          <button
            type="button"
            className="btn-primary px-4 py-3 text-sm rounded-2xl"
            onClick={onNew}
          >
            + Ny idé
          </button>
        }
      />

      <div className="overflow-x-visible pb-2 mb-10 -mx-1 px-1">
        <div className="proposal-filter-row pr-1">
          <ProposalFilterPill
            label="Alle"
            count={filterCounts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {ALL_PROPOSAL_STATUSES.map((s) => (
            <ProposalFilterPill
              key={s}
              label={STATUS_LABELS[s]}
              count={filterCounts[s]}
              active={filter === s}
              onClick={() => setFilter(s)}
            />
          ))}
        </div>
      </div>

      {loading && (
        <div className="app-card app-card--muted p-5 text-center">
          <p className="status-note">Henter forslag...</p>
        </div>
      )}
      {error && <p className="status-error py-4">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="app-card app-card--muted p-6 text-center">
          <p className="text-4xl mb-3">💡</p>
          <p className="text-sm font-semibold">Ingen forslag her endnu.</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Opret den første idé for at komme i gang.
          </p>
        </div>
      )}

      <ProposalCardStack>
        {filtered.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} onClick={onSelect} />
        ))}
      </ProposalCardStack>
    </div>
  );
}
