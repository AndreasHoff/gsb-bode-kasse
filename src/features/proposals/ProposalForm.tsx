import { useEffect, useState } from "react";
import type { FeatureProposal } from "../../types/domain";
import { createProposal, getProposal, updateProposal } from "../../lib/firestore";
import type { CreateProposalInput, UpdateProposalInput } from "../../lib/firestore";
import {
  ProposalField,
  ProposalPageHeader,
  ProposalSection,
} from "./proposal-layout.tsx";

interface Props {
  proposalId?: string;
  onSave: (id: string) => void;
  onCancel: () => void;
}

export default function ProposalForm({ proposalId, onSave, onCancel }: Props) {
  const isEditMode = proposalId !== undefined;

  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [whereInApp, setWhereInApp] = useState("");
  const [priority, setPriority] = useState<"" | "1" | "2" | "3" | "4">("");
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proposalId) return;

    setLoading(true);
    void getProposal(proposalId)
      .then((p: FeatureProposal | null) => {
        if (!p) return;
        setTitle(p.title);
        setProblem(p.problem);
        setDesiredOutcome(p.desiredOutcome);
        setWhereInApp(p.whereInApp ?? "");
        setPriority(
          p.priority !== undefined
            ? (String(p.priority) as "1" | "2" | "3" | "4")
            : "",
        );
      })
      .catch(() => setError("Kunne ikke hente forslaget"))
      .finally(() => setLoading(false));
  }, [proposalId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !problem.trim() || !desiredOutcome.trim()) return;

    setSaving(true);
    setError(null);

    try {
      if (isEditMode && proposalId) {
        const input: UpdateProposalInput = {
          title: title.trim(),
          problem: problem.trim(),
          desiredOutcome: desiredOutcome.trim(),
          whereInApp: whereInApp.trim() || undefined,
          priority: priority ? (Number(priority) as 1 | 2 | 3 | 4) : undefined,
        };
        await updateProposal(proposalId, input);
        onSave(proposalId);
      } else {
        const input: CreateProposalInput = {
          title: title.trim(),
          problem: problem.trim(),
          desiredOutcome: desiredOutcome.trim(),
          ...(whereInApp.trim() && { whereInApp: whereInApp.trim() }),
          ...(priority && { priority: Number(priority) as 1 | 2 | 3 | 4 }),
        };
        const created = await createProposal(input);
        onSave(created.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt. Prøv igen.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="app-page">
        <p className="status-note text-center py-8">Henter forslag...</p>
      </div>
    );
  }

  return (
    <div className="app-page pb-8">
      <button
        type="button"
        className="mb-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        onClick={onCancel}
      >
        ← Tilbage
      </button>

      <ProposalPageHeader
        title={isEditMode ? "Rediger idé" : "Ny idé"}
      />

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="proposal-form-stack"
      >
        <ProposalField label="Titel *" hint="Hvad vil du have? (en sætning)">
          <input
            className="field__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. Tilføj søgefunktion til galleriet"
            required
          />
        </ProposalField>

        <ProposalField
          label="Problem *"
          hint="Hvad er udfordringen? Hvorfor ønsker du dette?"
        >
          <textarea
            className="field__input"
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Beskriv problemet eller behovet..."
            required
          />
        </ProposalField>

        <ProposalField
          label="Ønsket udfald *"
          hint="Hvad skal det se ud / virke som, når det er færdigt?"
        >
          <textarea
            className="field__input"
            rows={4}
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="Beskriv det ønskede resultat..."
            required
          />
        </ProposalField>

        <ProposalField
          label={"Sted i appen (valgfri)"}
          hint="Hvilken side eller del af appen handler dette om?"
        >
          <input
            className="field__input"
            type="text"
            value={whereInApp}
            onChange={(e) => setWhereInApp(e.target.value)}
            placeholder="F.eks. Albumvisning, Upload-side..."
          />
        </ProposalField>

        <ProposalSection title="Prioritet (valgfri)">
          <p className="proposal-field__hint mb-4">Hvor vigtigt er dette for dig?</p>
          <div className="proposal-chip-group">
            <PriorityChip
              label="Lav"
              value={1}
              isActive={priority === "1"}
              onClick={() => setPriority((prev) => (prev === "1" ? "" : "1"))}
            />
            <PriorityChip
              label="Moderat"
              value={2}
              isActive={priority === "2"}
              onClick={() => setPriority((prev) => (prev === "2" ? "" : "2"))}
            />
            <PriorityChip
              label="Høj"
              value={3}
              isActive={priority === "3"}
              onClick={() => setPriority((prev) => (prev === "3" ? "" : "3"))}
            />
            <PriorityChip
              label="Kritisk"
              value={4}
              isActive={priority === "4"}
              onClick={() => setPriority((prev) => (prev === "4" ? "" : "4"))}
            />
          </div>
        </ProposalSection>

        {error && <p className="status-error">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 rounded-2xl" disabled={saving}>
          {saving ? "Gemmer..." : isEditMode ? "Gem ændringer" : "Opret idé"}
        </button>
      </form>
    </div>
  );
}

function PriorityChip({
  label,
  value,
  isActive,
  onClick,
}: {
  label: string;
  value: 1 | 2 | 3 | 4;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="proposal-chip"
      style={
        isActive
          ? {
              borderColor: "var(--color-primary)",
              background: "color-mix(in srgb, var(--color-primary) 32%, transparent)",
              color: "var(--color-text)",
            }
          : {
              borderColor: "var(--color-border)",
              background: "color-mix(in srgb, var(--color-surface) 76%, transparent)",
              color: "var(--color-text)",
            }
      }
    >
      <span className="inline-flex items-center gap-2">
        <span className={`priority-dot priority-dot--${value}`} />
        {label}
      </span>
    </button>
  );
}
