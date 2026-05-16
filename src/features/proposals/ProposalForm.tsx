import { useEffect, useState } from "react";
import type { FeatureProposal } from "../../types/domain";
import { createProposal, getProposal, updateProposal } from "../../lib/firestore";
import type { CreateProposalInput, UpdateProposalInput } from "../../lib/firestore";

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
        setPriority(p.priority !== undefined ? (String(p.priority) as "1" | "2" | "3" | "4") : "");
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
    <div className="app-page">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-sm"
          onClick={onCancel}
        >
          ← Tilbage
        </button>
        <h1 className="app-title">{isEditMode ? "Rediger forslag" : "Nyt forslag"}</h1>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex flex-col gap-4"
      >
        <label className="field">
          <span className="field__label">Titel *</span>
          <input
            className="field__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kort og beskrivende titel"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Hvad er problemet? *</span>
          <textarea
            className="field__input"
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="Beskriv hvad der er svært, forvirrende eller mangler i dag"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Hvad bør ske i stedet? *</span>
          <textarea
            className="field__input"
            rows={4}
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="Beskriv den ønskede adfærd eller løsning"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Hvor i appen?</span>
          <input
            className="field__input"
            type="text"
            value={whereInApp}
            onChange={(e) => setWhereInApp(e.target.value)}
            placeholder="F.eks. Holdoversigt, Bødeliste..."
          />
        </label>

        <label className="field">
          <span className="field__label">Prioritet</span>
          <select
            className="field__input"
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as "" | "1" | "2" | "3" | "4")
            }
          >
            <option value="">Ingen</option>
            <option value="1">Lav</option>
            <option value="2">Moderat</option>
            <option value="3">Høj</option>
            <option value="4">Kritisk</option>
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? "Gemmer..." : isEditMode ? "Gem ændringer" : "Opret forslag"}
        </button>
      </form>
    </div>
  );
}
