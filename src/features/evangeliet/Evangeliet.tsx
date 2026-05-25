// Feature: Evangeliet (F011)
// Read-only scroll-style view of the team's fine rules.
// All members see the rules; no editing or creation from this view.

import { useCallback, useEffect, useState } from "react";
import type { FineRule } from "../../types/domain";
import { getFineRules } from "../../lib/firestore";
import { formatAmount } from "../../lib/utils";
import "./Evangeliet.css";

interface Props {
  teamId: string;
}

export default function Evangeliet({ teamId }: Props) {
  const [rules, setRules] = useState<FineRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(() => {
    setLoading(true);
    setError(null);
    void getFineRules(teamId)
      .then((all) => setRules(all.filter((r) => r.isActive)))
      .catch(() => setError("Kunne ikke hente Evangeliet"))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  if (!teamId) {
    return (
      <div className="app-page">
        <h1 className="app-title">Evangeliet</h1>
        <div className="empty-state mt-6">
          <p className="text-4xl mb-3">📜</p>
          <p className="text-sm">Intet hold valgt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page pb-8">
      <div className="evangeliet">
        <section className="app-card evangeliet-hero">
          <p className="eyebrow">GSB Bødekassens skriftrulle</p>
          <div className="evangeliet-hero__header">
            <div>
              <h1 className="app-title">Evangeliet</h1>
              <p className="app-subtitle">
                Alle bøder, beløb og forklaringer samlet ét sted for hele holdet.
              </p>
            </div>
          </div>
          <div className="evangeliet-hero__chips">
            <span className="evangeliet-chip">
              {loading ? "Henter skriftrullen..." : `${rules.length} opslag i Evangeliet`}
            </span>
          </div>
        </section>

        {error && (
          <p className="evangeliet-alert" role="alert">
            {error}
          </p>
        )}

        <section className="evangeliet-scroll" aria-label="Evangeliet">
          <div className="evangeliet-scroll__rod evangeliet-scroll__rod--top" aria-hidden="true" />
          <div className="evangeliet-scroll__body">
            <p className="evangeliet-scroll__intro">
              Her finder du holdets samlede oversigt over bøder og forklaringer. Rul i ro og
              mag gennem reglerne, før du møder op til næste træning.
            </p>

            {loading && (
              <div className="evangeliet-state">
                <span className="evangeliet-state__icon" aria-hidden="true">
                  ⏳
                </span>
                <p className="status-note">Skriftrullen bliver hentet...</p>
              </div>
            )}

            {!loading && !error && rules.length === 0 && (
              <div className="evangeliet-state">
                <span className="evangeliet-state__icon" aria-hidden="true">
                  📜
                </span>
                <p className="text-sm font-semibold">Evangeliet er tomt endnu.</p>
                <p className="text-xs mt-2">
                  Bødetyper oprettes under fanen "Bøder".
                </p>
              </div>
            )}

            {!loading && rules.length > 0 && (
              <ol className="evangeliet-scroll__list">
                {rules.map((rule, index) => (
                  <li key={rule.id}>
                    <EvangelietEntry index={index} rule={rule} />
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div
            className="evangeliet-scroll__rod evangeliet-scroll__rod--bottom"
            aria-hidden="true"
          />
        </section>
      </div>
    </div>
  );
}

interface EntryProps {
  index: number;
  rule: FineRule;
}

function EvangelietEntry({ index, rule }: EntryProps) {
  return (
    <article className="evangeliet-entry">
      <div className="evangeliet-entry__header">
        <span className="evangeliet-entry__number">§ {index + 1}</span>
        <div>
          <p className="evangeliet-entry__title">
            <span className="evangeliet-entry__title-line">
              {rule.emoji && <span aria-hidden="true">{rule.emoji}</span>}
              <span>{rule.title}</span>
            </span>
          </p>
          <span className="evangeliet-entry__amount">{formatAmount(rule.amount)}</span>
        </div>
      </div>

      <p
        className={`evangeliet-entry__description ${
          rule.description ? "" : "evangeliet-entry__description--muted"
        }`}
      >
        {rule.description || "Ingen forklaring tilføjet endnu."}
      </p>
    </article>
  );
}
