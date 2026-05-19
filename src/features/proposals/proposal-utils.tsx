import type { ProposalStatus } from "../../types/domain";

export type PriorityValue = 1 | 2 | 3 | 4;

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  new: "Ny",
  triaged: "Under vurdering",
  planned: "Planlagt",
  implemented: "Implementeret",
  done: "Færdig",
  abandoned: "Opgivet",
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Lav",
  2: "Moderat",
  3: "Høj",
  4: "Kritisk",
};

const PRIORITY_DOT_CLASS: Record<PriorityValue, string> = {
  1: "priority-dot--1",
  2: "priority-dot--2",
  3: "priority-dot--3",
  4: "priority-dot--4",
};

export const ALL_PROPOSAL_STATUSES: ProposalStatus[] = [
  "new",
  "triaged",
  "planned",
  "implemented",
  "done",
  "abandoned",
];

export const LOCKED_STATUSES: ProposalStatus[] = ["done", "implemented", "abandoned"];

const STATUS_COLORS: Record<ProposalStatus, string> = {
  new: "status-badge--new",
  triaged: "status-badge--triaged",
  planned: "status-badge--planned",
  implemented: "status-badge--implemented",
  done: "status-badge--done",
  abandoned: "status-badge--abandoned",
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={`status-badge shrink-0 ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  withPrefix = false,
}: {
  priority: PriorityValue;
  withPrefix?: boolean;
}) {
  return (
    <span className="priority-badge">
      <span className={`priority-dot ${PRIORITY_DOT_CLASS[priority]}`} />
      {withPrefix ? `Prioritet: ${PRIORITY_LABELS[priority]}` : PRIORITY_LABELS[priority]}
    </span>
  );
}
