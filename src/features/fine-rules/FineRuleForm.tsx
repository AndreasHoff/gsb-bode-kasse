// Feature: Fine Rules Catalog (F010)
// Form for creating and editing FineRule entries (admin only)

import { useEffect, useState } from "react";
import type { FineRule } from "../../types/domain";
import {
  createFineRule,
  getFineRule,
  updateFineRule,
} from "../../lib/firestore";
import { formatAmount } from "../../lib/utils";

interface Props {
  teamId: string;
  userId: string;
  ruleId?: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function FineRuleForm({
  teamId,
  userId,
  ruleId,
  onSave,
  onCancel,
}: Props) {
  const isEditMode = ruleId !== undefined;

  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ruleId) return;

    setLoading(true);
    void getFineRule(teamId, ruleId)
      .then((rule: FineRule | null) => {
        if (!rule) return;
        setTitle(rule.title);
        setAmountStr(String(rule.amount));
        setEmoji(rule.emoji ?? "");
        setDescription(rule.description ?? "");
      })
      .catch(() => setError("Kunne ikke hente bøden"))
      .finally(() => setLoading(false));
  }, [teamId, ruleId]);

  const amount = Number(amountStr);
  const isValid = title.trim().length > 0 && amountStr.trim().length > 0 && amount > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      if (isEditMode && ruleId) {
        await updateFineRule(
          teamId,
          ruleId,
          {
            title: title.trim(),
            amount,
            emoji: emoji.trim() || undefined,
            description: description.trim() || undefined,
          },
          userId,
        );
      } else {
        await createFineRule(
          {
            teamId,
            title: title.trim(),
            amount,
            emoji: emoji.trim() || undefined,
            description: description.trim() || undefined,
            isActive: true,
            createdBy: userId,
            createdAt: new Date().toISOString(),
          },
          userId,
        );
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt. Prøv igen.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="app-page">
        <p className="status-note text-center py-8">Henter bøde...</p>
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

      <div className="mb-6">
        <h1 className="app-title">{isEditMode ? "Rediger bøde" : "Ny bøde"}</h1>
        <p className="app-subtitle">
          {isEditMode ? "Opdater bødetypen" : "Opret en ny bødetype til holdet"}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="fr-title">
            Titel *
          </label>
          <input
            id="fr-title"
            className="field__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. For sent til træning"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="fr-amount">
            Beløb (kr.) *
          </label>
          <input
            id="fr-amount"
            className="field__input"
            type="number"
            min={1}
            step={1}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="F.eks. 50"
            required
          />
          {amount > 0 && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {formatAmount(amount)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="fr-emoji">
            Emoji (valgfri)
          </label>
          <input
            id="fr-emoji"
            className="field__input"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="F.eks. ⏰"
            maxLength={4}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="fr-desc">
            Beskrivelse (valgfri)
          </label>
          <textarea
            id="fr-desc"
            className="field__input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kort forklaring af bøden..."
          />
        </div>

        {error && <p className="status-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary w-full py-3 rounded-2xl"
          disabled={saving || !isValid}
        >
          {saving ? "Gemmer..." : isEditMode ? "Gem ændringer" : "Opret bøde"}
        </button>
      </form>
    </div>
  );
}
