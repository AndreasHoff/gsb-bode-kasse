import type { ProposalStatus } from "../../types/domain";

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
  new: "bg-gray-100 text-gray-700",
  triaged: "bg-blue-100 text-blue-700",
  planned: "bg-amber-100 text-amber-700",
  implemented: "bg-teal-100 text-teal-700",
  done: "bg-green-100 text-green-700",
  abandoned: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
