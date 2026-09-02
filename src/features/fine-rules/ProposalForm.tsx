// Feature: Member Fine Rule Proposals (F026)
// Form for members to submit new fine rule proposals

import { useEffect, useState } from "react";
import { useProposalSubmit } from "./useProposalSubmit";
import { formatAmount } from "../../lib/utils";

interface Props {
  teamId: string;
  seasonId: string;
  userId: string;
  userName: string;
  onSave: (proposalId: string) => void;
  onCancel: () => void;
}

export default function ProposalForm({
  teamId,
  seasonId,
  userId,
  userName,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [emoji, setEmoji] = useState("");
  const [description, setDescription] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { loading: submitting, error, submit } = useProposalSubmit();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const amount = Number(amountStr);
  const isValid = title.trim().length > 0 && amountStr.trim().length > 0 && amount > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid || submitting) return;

    try {
      const proposalId = await submit(teamId, seasonId, userId, userName, {
        title: title.trim(),
        amount,
        emoji: emoji.trim() || undefined,
        description: description.trim() || undefined,
      });

      setToastMessage("Dit forslag er modtaget ✓");

      // Redirect after a brief delay
      setTimeout(() => {
        onSave(proposalId);
      }, 1500);
    } catch {
      // Error is already set by the hook
    }
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
        <h1 className="app-title">Nyt bøde forslag</h1>
        <p className="app-subtitle">Foreslå en ny bødetype til holdet</p>
      </div>

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="p-title">
            Navn på bøde *
          </label>
          <input
            id="p-title"
            className="field__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="F.eks. Kom for sent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="p-amount">
            Beløb (kr.) *
          </label>
          <input
            id="p-amount"
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
          <label className="block text-sm font-semibold mb-1" htmlFor="p-emoji">
            Emoji (valgfri)
          </label>
          <input
            id="p-emoji"
            className="field__input"
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            placeholder="F.eks. 😴"
            maxLength={2}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1" htmlFor="p-desc">
            Beskrivelse (valgfri)
          </label>
          <textarea
            id="p-desc"
            className="field__input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kort forklaring af forslaget..."
          />
        </div>

        {error && <p className="status-error">{error}</p>}

        {toastMessage && (
          <p className="status-success">{toastMessage}</p>
        )}

        <button
          type="submit"
          className="btn-primary w-full py-3 rounded-2xl"
          disabled={submitting || !isValid}
        >
          {submitting ? "Gemmer..." : "Opret forslag"}
        </button>
      </form>
    </div>
  );
}
