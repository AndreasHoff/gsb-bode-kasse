// Feature: Season Management (F021)
// Admin can create a new season.

import { useEffect, useState } from "react";
import type { Season } from "../../types/domain";
import { getActiveSeason, createSeason } from "../../lib/firestore";

interface Props {
  teamId: string;
  actorId: string;
}

export default function SeasonManagement({ teamId, actorId }: Props) {
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");

  useEffect(() => {
    void load();
  }, [teamId]);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const active = await getActiveSeason(teamId);
      setSeason(active);
    } catch {
      setError("Kunne ikke hente sæsoninfo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(): Promise<void> {
    const name = newSeasonName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createSeason(
        {
          teamId,
          name,
          startDate: new Date().toISOString(),
          isActive: true,
        },
        actorId,
      );
      setSeason(created);
      setNewSeasonName("");
    } catch {
      setError("Oprettelse af sæson mislykkedes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-[var(--color-text-muted)]">Henter sæson…</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        Aktiv sæson
      </h2>

      {error && <p className="status-error mb-3">{error}</p>}

      {season ? (
        <div className="season-management__card">
          <p className="season-management__label">Sæson</p>
          <p className="season-management__name">{season.name}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            For at afslutte sæsonen, gå til fanen "Indstillinger".
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            Ingen aktiv sæson. Opret en ny for at begynde at tildele bøder.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Sæsonnavn, f.eks. 2026/2027"
              className="field__input"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              disabled={submitting}
            />
            <button
              type="button"
              className="btn-primary w-full"
              disabled={!newSeasonName.trim() || submitting}
              onClick={() => void handleCreate()}
            >
              {submitting ? "Opretter…" : "Opret sæson"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
