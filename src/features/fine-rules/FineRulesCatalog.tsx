// Feature: Fine Rules Catalog (F010) + Member Fine Rule Proposals (F026)
// Shows all fine rule types for the team.
// Normal users: read-only list + proposal button. Admin: full CRUD + proposal review.

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import type { FineRule, Role, Season } from "../../types/domain";
import { getFineRules } from "../../lib/firestore";
import { canManageFineRules, canProposeFineRules, canReviewFineRuleProposals } from "../../lib/permissions";
import { formatAmount } from "../../lib/utils";
import FineRuleForm from "./FineRuleForm";
import ProposalForm from "./ProposalForm";
import MyProposals from "./MyProposals";
import ProposalDetail from "./ProposalDetail";
import AdminProposalList from "./AdminProposalList";
import AdminProposalDetail from "./AdminProposalDetail";

interface Props {
  teamId: string;
  userRole: Role | null;
  userId: string;
  userName: string;
  activeSeasonId: string;
}

type View =
  | { screen: "list" }
  | { screen: "form"; ruleId?: string }
  | { screen: "proposalForm" }
  | { screen: "myProposals" }
  | { screen: "proposalDetail"; proposalId: string }
  | { screen: "adminProposals" }
  | { screen: "adminProposalDetail"; proposalId: string };

export default function FineRulesCatalog({
  teamId,
  userRole,
  userId,
  userName,
  activeSeasonId,
}: Props) {
  const [view, setView] = useState<View>({ screen: "list" });
  const [pendingProposalCount, setPendingProposalCount] = useState(0);

  const canManageRules = canManageFineRules(userRole);
  const canPropose = canProposeFineRules(userRole);
  const canReview = canReviewFineRuleProposals(userRole);

  // Monitor pending proposals count for badge
  useEffect(() => {
    if (!canReview) return; // Only admins need to see the count

    const db = getFirestore();
    const q = query(
      collection(db, "teams", teamId, "fineRuleProposals"),
      where("status", "==", "pending"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingProposalCount(snapshot.docs.length);
      },
      (err) => {
        console.error("Error loading proposal count:", err);
      },
    );

    return () => unsubscribe();
  }, [teamId, canReview]);

  if (!teamId) {
    return (
      <div className="app-page">
        <h1 className="app-title">Bøder</h1>
        <div className="empty-state mt-4">
          <span className="empty-state__emoji">📋</span>
          <p className="empty-state__text">Intet hold valgt.</p>
        </div>
      </div>
    );
  }

  // Admin: fine rule form
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

  // Member: proposal form
  if (view.screen === "proposalForm" && canPropose) {
    return (
      <ProposalForm
        teamId={teamId}
        seasonId={activeSeasonId}
        userId={userId}
        userName={userName}
        onSave={() => setView({ screen: "myProposals" })}
        onCancel={() => setView({ screen: "list" })}
      />
    );
  }

  // Member: my proposals
  if (view.screen === "myProposals") {
    return (
      <MyProposals
        teamId={teamId}
        userId={userId}
        onSelectProposal={(proposalId) => setView({ screen: "proposalDetail", proposalId })}
        onBack={() => setView({ screen: "list" })}
      />
    );
  }

  // Member: proposal detail
  if (view.screen === "proposalDetail") {
    return (
      <ProposalDetail
        teamId={teamId}
        seasonId={activeSeasonId}
        proposalId={view.proposalId}
        userId={userId}
        userName={userName}
        onBack={() => setView({ screen: "myProposals" })}
        onDeleted={() => setView({ screen: "myProposals" })}
      />
    );
  }

  // Admin: review proposals list
  if (view.screen === "adminProposals" && canReview) {
    return (
      <AdminProposalList
        teamId={teamId}
        onSelectProposal={(proposalId) => setView({ screen: "adminProposalDetail", proposalId })}
        onBack={() => setView({ screen: "list" })}
      />
    );
  }

  // Admin: review proposal detail
  if (view.screen === "adminProposalDetail" && canReview) {
    return (
      <AdminProposalDetail
        teamId={teamId}
        proposalId={view.proposalId}
        adminId={userId}
        onBack={() => setView({ screen: "adminProposals" })}
        onProcessed={() => setView({ screen: "adminProposals" })}
      />
    );
  }

  return (
    <FineRulesList
      teamId={teamId}
      userRole={userRole}
      onNew={canManageRules ? () => setView({ screen: "form" }) : undefined}
      onEdit={canManageRules ? (ruleId) => setView({ screen: "form", ruleId }) : undefined}
      onPropose={canPropose ? () => setView({ screen: "proposalForm" }) : undefined}
      onMyProposals={() => setView({ screen: "myProposals" })}
      onReviewProposals={canReview ? () => setView({ screen: "adminProposals" }) : undefined}
      pendingProposalCount={pendingProposalCount}
    />
  );
}

interface ListProps {
  teamId: string;
  userRole: Role | null;
  onNew?: () => void;
  onEdit?: (ruleId: string) => void;
  onPropose?: () => void;
  onMyProposals: () => void;
  onReviewProposals?: () => void;
  pendingProposalCount: number;
}

function FineRulesList({
  teamId,
  userRole,
  onNew,
  onEdit,
  onPropose,
  onMyProposals,
  onReviewProposals,
  pendingProposalCount,
}: ListProps) {
  const [rules, setRules] = useState<FineRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageRules = canManageFineRules(userRole);
  const canPropose = canProposeFineRules(userRole);

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
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="app-title">Bøder</h1>
          <p className="app-subtitle">
            {loading ? "Henter..." : `${rules.length} bødetype${rules.length !== 1 ? "r" : ""}`}
          </p>
        </div>
        
        {/* Admin buttons */}
        {canManageRules && (
          <div className="flex gap-2 shrink-0">
            {onNew && (
              <button
                type="button"
                className="btn-primary btn-small shrink-0"
                onClick={onNew}
              >
                + Ny bøde
              </button>
            )}
            {onReviewProposals && (
              <div className="relative">
                <button
                  type="button"
                  className="btn-secondary btn-small shrink-0 flex items-center gap-2"
                  onClick={onReviewProposals}
                  disabled={pendingProposalCount === 0}
                >
                  📋 Nye forslag
                  {pendingProposalCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 text-white rounded-full">
                      {pendingProposalCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Member buttons */}
        {!canManageRules && canPropose && (
          <button
            type="button"
            className="btn-primary btn-small shrink-0"
            onClick={onPropose}
          >
            + Ny forslag
          </button>
        )}
      </div>

      {error && <p className="status-error mb-4">{error}</p>}

      {loading && <p className="status-note">Henter bøder...</p>}

      {!loading && !error && rules.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__emoji">📋</span>
          <p className="section-heading mb-2">Ingen bøder oprettet endnu.</p>
          {canManageRules && (
            <p className="empty-state__text">Tryk "+ Ny bøde" for at oprette den første bødetype.</p>
          )}
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="item-list">
          {rules.map((rule) => (
            <FineRuleCard
              key={rule.id}
              rule={rule}
              canManageRules={canManageRules}
              onEdit={onEdit ? () => onEdit(rule.id) : undefined}
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
  onEdit?: () => void;
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
          {canManageRules && onEdit && (
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
