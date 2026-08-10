// Feature: Import Fine Rules for Season 25/26
// Admin can bulk-import the pre-defined fine rules for the season.

import { useState } from "react";
import { bulkCreateFineRules } from "../../lib/firestore";
import { fineRulesSeason2526 } from "../../lib/firestore/seedRulesSeason2526";

interface Props {
  teamId: string;
  actorId: string;
}

export default function ImportFineRules({ teamId, actorId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(): Promise<void> {
    if (loading) return;
    if (
      !window.confirm(
        `Er du sikker? Dette vil importere ${fineRulesSeason2526.length} bøderegler for sæson 25/26.\n\nBøder der allerede findes springes over.`,
      )
    )
      return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await bulkCreateFineRules(teamId, fineRulesSeason2526, actorId);
      setResult(res);
      if (res.errors.length > 0) {
        setError(`Import fuldført med fejl:\n${res.errors.join("\n")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Importering mislykkedes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
          Importér bøderegler
        </h2>

        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Importer de foruddefinerede {fineRulesSeason2526.length} bøderegler for sæson 25/26.
          Regler der allerede findes springes over.
        </p>

        {error && <p className="status-error mb-4">{error}</p>}

        {result && (
          <div className="app-card p-3 mb-4 flex flex-col gap-2">
            <p className="text-sm font-bold">✅ Import fuldført</p>
            <p className="text-xs text-[var(--color-text)]">
              Oprettet: <strong>{result.created}</strong>
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Sprunget over: {result.skipped}
            </p>
            {result.errors.length > 0 && (
              <p className="text-xs text-[var(--color-error)]">
                Fejl: {result.errors.length}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          disabled={loading}
          onClick={() => void handleImport()}
        >
          {loading ? "Importerer…" : "Importér alle bøderegler"}
        </button>
      </section>
    </div>
  );
}
