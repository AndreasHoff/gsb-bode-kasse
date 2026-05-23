// Feature: Fine Rules Catalog (F010)
// Shows all fine rule types for the team.
// Normal users: read-only list. Admin: full CRUD.

import { useCallback, useEffect, useState } from "react";
import type { FineRule, Role } from "../../types/domain";
import { getFineRules } from "../../lib/firestore";
import { canManageFineRules } from "../../lib/permissions";
import { formatAmount } from "../../lib/utils";
import FineRuleForm from "./FineRuleForm";

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

  const canManageRules = isSuperAdmin || (userRole !== null && canManageFineRules(userRole));

  if (!teamId) {
    return (
      <div className="app-page">
        <h1 className="app-title">Bøder</h1>
        <div className="empty-state mt-6">
          <p className="text-4xl mb-3">📋</p>
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

  const canManageRules = isSuperAdmin || (userRole !== null && canManageFineRules(userRole));

  const loadRules = useCallback(() => {
    setLoading(true);
    setError(null);
    void getFineRules(teamId)
      .then((all) => setRules(all.filter((r) => r.isActive)))
      .catch(() => setError("Kunne ikke hente bøder"))
      .finally(() => setLoading(false));
  }, [teamId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  return (
    <div className="app-page pb-8">
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="app-title">Bøder</h1>
          <p className="app-subtitle">
            {loading ? "Henter..." : `${rules.length} bødetype${rules.length !== 1 ? "r" : ""}`}
          </p>
        </div>
        {canManageRules && (
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm rounded-2xl shrink-0"
            onClick={onNew}
          >
            + Ny bøde
          </button>
        )}
      </div>

      {error && <p className="status-error mb-4">{error}</p>}

      {loading && (
        <div className="app-card app-card--muted p-5 text-center">
          <p className="status-note">Henter bøder...</p>
        </div>
      )}

      {!loading && !error && rules.length === 0 && (
        <div className="app-card app-card--muted p-6 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-semibold">Ingen bøder oprettet endnu.</p>
          {canManageRules && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Tryk "+ Ny bøde" for at oprette den første bødetype.
            </p>
          )}
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <FineRuleCard
              key={rule.id}
              rule={rule}
              canManageRules={canManageRules}
              onEdit={() => onEdit(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  rule: FineRule;
  canManageRules: boolean;
  onEdit: () => void;
}

function FineRuleCard({
  rule,
  canManageRules,
  onEdit,
}: CardProps) {
  return (
    <div className="app-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {rule.emoji && (
            <span className="text-2xl shrink-0" aria-hidden="true">
              {rule.emoji}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{rule.title}</p>
            {rule.description && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                {rule.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-[var(--color-primary-contrast)] bg-[var(--color-primary)] px-2.5 py-1 rounded-xl">
            {formatAmount(rule.amount)}
          </span>
          {canManageRules && (
            <div className="flex gap-1">
              <button
                type="button"
                className="btn-secondary px-2.5 py-1 text-xs rounded-xl"
                onClick={onEdit}
                aria-label={`Rediger ${rule.title}`}
              >
                ✏️
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
