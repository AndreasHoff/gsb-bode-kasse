// Feature: Evangeliet / Fine Rules Catalog (F010)
// Shows all fine rule types for the team in a readable scroll-style view.
// Normal users: read-only list. Admin + super-admin: full CRUD.

import { useCallback, useEffect, useState } from "react";
import type { FineRule, Role } from "../../types/domain";
import { getFineRules } from "../../lib/firestore";
import { canManageFineRules } from "../../lib/permissions";
import { formatAmount } from "../../lib/utils";
import FineRuleForm from "./FineRuleForm";
import "./FineRulesCatalog.css";

interface Props {
  teamId: string;
  userRole: Role | null;
  userId: string;
  isSuperAdmin: boolean;
}

type View =
  | { screen: "list" }
  | { screen: "form"; ruleId?: string };

export default function FineRulesCatalog({
  teamId,
  userRole,
  userId,
  isSuperAdmin,
}: Props) {
  const [view, setView] = useState<View>({ screen: "list" });

  const canManageRules = canManageFineRules(userRole, isSuperAdmin);

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

  if (view.screen === "form" && canManageRules) {
    return (
      <FineRuleForm
        teamId={teamId}
        userId={userId}
        ruleId={view.ruleId}
        onSave={() => setView({ screen: "list" })}
        onCancel={() => setView({ screen: "list" })}
      />
    );
  }

  return (
    <FineRulesList
      teamId={teamId}
      userRole={userRole}
      isSuperAdmin={isSuperAdmin}
      onNew={() => setView({ screen: "form" })}
      onEdit={(ruleId) => setView({ screen: "form", ruleId })}
    />
  );
}

interface ListProps {
  teamId: string;
  userRole: Role | null;
  isSuperAdmin: boolean;
  onNew: () => void;
  onEdit: (ruleId: string) => void;
}

function FineRulesList({
  teamId,
  userRole,
  isSuperAdmin,
  onNew,
  onEdit,
}: ListProps) {
  const [rules, setRules] = useState<FineRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageRules = canManageFineRules(userRole, isSuperAdmin);

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
            {canManageRules && (
              <button
                type="button"
                className="btn-primary m-0 px-4 py-2 text-sm rounded-2xl shrink-0"
                onClick={onNew}
              >
                + Nyt opslag
              </button>
            )}
          </div>
          <div className="evangeliet-hero__chips">
            <span className="evangeliet-chip">
              {loading ? "Henter skriftrullen..." : `${rules.length} opslag i Evangeliet`}
            </span>
            <span className="evangeliet-chip">
              {canManageRules ? "Admin kan redigere indholdet" : "Læsning for alle medlemmer"}
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
                {canManageRules && (
                  <p className="text-xs mt-2">Tryk “+ Nyt opslag” for at skrive den første regel.</p>
                )}
              </div>
            )}

            {!loading && rules.length > 0 && (
              <ol className="evangeliet-scroll__list">
                {rules.map((rule, index) => (
                  <li key={rule.id}>
                    <FineRuleCard
                      index={index}
                      rule={rule}
                      canManageRules={canManageRules}
                      onEdit={() => onEdit(rule.id)}
                    />
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

interface CardProps {
  index: number;
  rule: FineRule;
  canManageRules: boolean;
  onEdit: () => void;
}

function FineRuleCard({
  index,
  rule,
  canManageRules,
  onEdit,
}: CardProps) {
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
        {canManageRules && (
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-xs rounded-2xl"
            onClick={onEdit}
            aria-label={`Rediger ${rule.title}`}
          >
            ✏️ Rediger
          </button>
        )}
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
