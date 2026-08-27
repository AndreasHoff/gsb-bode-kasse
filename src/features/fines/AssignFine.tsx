// REFACTOR(F001): The fine assignment flow needs a full redesign once season management
// is properly in place. The current approach ties fines to a seasonId at write time,
// but the season lifecycle (create → activate → close) is not yet user-facing.
// When seasons are introduced, revisit:
//   1. Season selection UX (auto-select active, or let admin pick)
//   2. Validation: block assignment when no active season exists
//   3. Fine listing grouped by season in TeamOverview / PersonalOverview
//   4. assignFineWithPayment server-side guard in fines.ts (currently commented out)
//   5. Remove "dev-no-season" placeholder seasonId
import { useEffect, useMemo, useState } from "react";
import type { FineRule, Membership, Role, Season, User } from "../../types/domain";
import {
  assignFineWithPayment,
  getActiveSeason,
  getFines,
  getFineRules,
  getMemberships,
  getUsers,
} from "../../lib/firestore";
import { canAssignFines } from "../../lib/permissions";
import { formatAmount } from "../../lib/utils";
import BulkOperationProgress from "../../components/BulkOperationProgress";
import "./assign-fine.css";

interface AssignFineProps {
  teamId: string;
  actorId: string;
  actorRole: Role | null;
  onAssigned: (payload: { fineIds: string[]; memberNames: string[] }) => void;
}

type DuplicateWarning = {
  memberNames: string[];
  ruleTitle: string;
};

export default function AssignFine({
  teamId,
  actorId,
  actorRole,
  onAssigned,
}: AssignFineProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [rules, setRules] = useState<FineRule[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);

  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [assignProgress, setAssignProgress] = useState<{ completed: number; total: number } | null>(
    null,
  );

  const hasPermission = canAssignFines(actorRole);

  useEffect(() => {
    let isActive = true;

    async function loadAssignData(): Promise<void> {
      if (!teamId) {
        setError("Intet hold valgt.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [season, allRules, memberships, users] = await Promise.all([
          getActiveSeason(teamId),
          getFineRules(teamId),
          getMemberships(teamId),
          getUsers(),
        ]);

        if (!isActive) {
          return;
        }

        setActiveSeason(season);
        const activeRules = allRules.filter((rule) => rule.isActive);
        setRules(activeRules);

        const activeMemberships = memberships.filter((member: Membership) => member.isActive);
        const activeMemberIds = new Set(activeMemberships.map((member) => member.userId));

        const activeUsers = users
          .filter((user) => activeMemberIds.has(user.id))
          .sort((a, b) => a.name.localeCompare(b.name, "da", { sensitivity: "base" }));

        setMembers(activeUsers);

        if (activeRules.length > 0) {
          setSelectedRuleId(activeRules[0].id);
        }

        if (activeUsers.length > 0) {
          setSelectedUserId(activeUsers[0].id);
          setSelectedUserIds([activeUsers[0].id]);
        }
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : "Ukendt fejl";
        setError(`Kunne ikke hente data til bødetildeling (${message}).`);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadAssignData();

    return () => {
      isActive = false;
    };
  }, [teamId]);

  const selectedRule = useMemo(
    () => rules.find((rule) => rule.id === selectedRuleId) ?? null,
    [rules, selectedRuleId],
  );

  const selectedTargets = useMemo(() => {
    if (mode === "single") {
      const selectedUser = members.find((member) => member.id === selectedUserId);
      return selectedUser ? [selectedUser] : [];
    }

    const selectedSet = new Set(selectedUserIds);
    return members.filter((member) => selectedSet.has(member.id));
  }, [members, mode, selectedUserId, selectedUserIds]);

  const allSelected = members.length > 0 && selectedUserIds.length === members.length;

  useEffect(() => {
    setDuplicateWarning(null);
  }, [mode, selectedRuleId, selectedUserId, selectedUserIds]);

  function handleToggleAllMembers(): void {
    if (allSelected) {
      setSelectedUserIds([]);
      return;
    }

    setSelectedUserIds(members.map((member) => member.id));
  }

  function handleToggleMember(memberId: string): void {
    setSelectedUserIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }

      return [...current, memberId];
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
    options?: { overrideDuplicates?: boolean },
  ): Promise<void> {
    event.preventDefault();

    if (!hasPermission) {
      setError("Du har ikke adgang til at tildele bøder.");
      return;
    }

    if (!teamId || !actorId || !selectedRule || !activeSeason) {
      if (!activeSeason) {
        setError("Ingen aktiv sæson. Opret eller aktiver en sæson først.");
      }
      return;
    }

    if (selectedTargets.length === 0) {
      setError(
        mode === "single"
          ? "Vælg en gyldig spiller."
          : "Vælg mindst 1 spiller før du kan tildele bøden.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    setAssignProgress(null);

    try {
      const selectedIds = selectedTargets.map((member) => member.id);

      if (!options?.overrideDuplicates) {
        const existingFines = await getFines(teamId);
        const today = new Date().toISOString().slice(0, 10);
        const selectedIdSet = new Set(selectedIds);
        const duplicateMembers = selectedTargets.filter((member) =>
          existingFines.some((fine) => {
            const fineDate = fine.createdAt.slice(0, 10);
            const targetUserId = fine.assignedTo[0];

            return (
              fineDate === today
              && fine.fineRuleId === selectedRule.id
              && targetUserId !== undefined
              && selectedIdSet.has(targetUserId)
              && targetUserId === member.id
            );
          })
        );

        if (duplicateMembers.length > 0) {
          setDuplicateWarning({
            memberNames: duplicateMembers.map((member) => member.name),
            ruleTitle: selectedRule.title,
          });
          setSubmitting(false);
          return;
        }
      }

      const { fines } = await assignFineWithPayment(
        {
          teamId,
          seasonId: activeSeason.id,
          fineRuleId: selectedRule.id,
          title: selectedRule.title,
          amount: selectedRule.amount,
          assignedTo: selectedIds,
          assignedBy: actorId,
          note: note.trim() || undefined,
          isShared: selectedIds.length > 1,
        },
        actorId,
        (completed: number, total: number) => {
          setAssignProgress({ completed, total });
        },
      );

      setNote("");
      if (mode === "multiple") {
        setSelectedUserIds([]);
      }
      setDuplicateWarning(null);
      setAssignProgress(null);

      setSuccessMessage(
        fines.length === 1 ? "1 bøde blev tildelt." : `${fines.length} bøder blev tildelt.`,
      );

      onAssigned({
        fineIds: fines.map((fine) => fine.id),
        memberNames: selectedTargets.map((member) => member.name),
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Ukendt fejl";
      setError(`Kunne ikke tildele bøde (${message}).`);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  if (!hasPermission) {
    return (
      <div className="assign-fine">
        <h1 className="app-title">Giv bøde</h1>
        <p className="status-error mt-4">Kun admins kan tildele bøder.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="assign-fine">
        <h1 className="app-title">Giv bøde</h1>
        <p className="status-note mt-4">Henter bødetyper og medlemmer...</p>
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="assign-fine">
        <h1 className="app-title">Giv bøde</h1>
        <div className="empty-state mt-4">
          <span className="empty-state__emoji">📅</span>
          <p className="section-heading mb-2">Ingen aktiv sæson</p>
          <p className="empty-state__text">Opret eller aktiver en sæson før du kan tildele bøder.</p>
        </div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="assign-fine">
        <h1 className="app-title">Giv bøde</h1>
        <div className="empty-state mt-4">
          <span className="empty-state__emoji">📋</span>
          <p className="section-heading mb-2">Ingen aktive bødetyper</p>
          <p className="empty-state__text">Gå til fanen "Bøder" og opret mindst én bødetype.</p>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="assign-fine">
        <h1 className="app-title">Giv bøde</h1>
        <div className="empty-state mt-4">
          <span className="empty-state__emoji">👥</span>
          <p className="section-heading mb-2">Ingen aktive medlemmer</p>
          <p className="empty-state__text">Tilføj medlemmer til holdet før du kan tildele bøder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assign-fine">
      <h1 className="app-title">Giv bøde</h1>
      <p className="app-subtitle mb-4">Tildel en bøde til én eller flere spillere</p>

      {successMessage && (
        <div className="assign-fine-success">
          <p className="assign-fine-success__title">✅ Succes!</p>
          <p className="assign-fine-success__text">{successMessage}</p>
        </div>
      )}

      <div className="assign-fine-mode-toggle">
        <button
          type="button"
          className={`assign-fine-mode-btn ${mode === "single" ? "assign-fine-mode-btn--active" : ""}`}
          onClick={() => setMode("single")}
          disabled={submitting}
        >
          Én spiller
        </button>
        <button
          type="button"
          className={`assign-fine-mode-btn ${mode === "multiple" ? "assign-fine-mode-btn--active" : ""}`}
          onClick={() => setMode("multiple")}
          disabled={submitting}
        >
          Flere spillere
        </button>
      </div>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="assign-fine-form"
      >
        <div className="form-group">
          <label htmlFor="assign-rule" className="form-label">
            Bøde
          </label>
          <select
            id="assign-rule"
            className="form-select"
            value={selectedRuleId}
            onChange={(event) => setSelectedRuleId(event.target.value)}
            disabled={submitting}
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.emoji ? `${rule.emoji} ` : ""}
                {rule.title} ({formatAmount(rule.amount)})
              </option>
            ))}
          </select>
        </div>

        {mode === "single" && (
          <div className="form-group">
            <label htmlFor="assign-member" className="form-label">
              Spiller
            </label>
            <select
              id="assign-member"
              className="form-select"
              value={selectedUserId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedUserId(value);
                setSelectedUserIds(value ? [value] : []);
              }}
              disabled={submitting}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "multiple" && (
          <div>
            <div className="assign-fine-multi-header">
              <p className="assign-fine-multi-label">Spillere</p>
              <button
                type="button"
                className="btn-secondary btn-small assign-fine-select-all"
                onClick={handleToggleAllMembers}
                disabled={submitting || members.length === 0}
              >
                {allSelected ? "Fjern alle" : "Vælg alle"}
              </button>
            </div>

            <div className="assign-fine-members-list">
              {members.map((member) => {
                const checked = selectedUserIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    className={`assign-fine-member-item ${checked ? "assign-fine-member-item--selected" : ""}`}
                    onClick={() => handleToggleMember(member.id)}
                  >
                    <div className="assign-fine-checkbox">
                      {checked && "✓"}
                    </div>
                    <span className="assign-fine-member-name">{member.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="assign-note" className="form-label">
            Notat (valgfri)
          </label>
          <textarea
            id="assign-note"
            className="form-textarea"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={submitting}
            placeholder="F.eks. kom 10 minutter for sent"
          />
        </div>

        <div className="assign-fine-summary">
          <p className="assign-fine-summary__title">Klar til tildeling</p>
          <div className="assign-fine-summary__row">
            <span className="assign-fine-summary__label">Spillere:</span>
            <span className="assign-fine-summary__value assign-fine-summary__value--highlight">
              {selectedTargets.length === 1
                ? "1 spiller"
                : `${selectedTargets.length} spillere`}
            </span>
          </div>
          <div className="assign-fine-summary__row">
            <span className="assign-fine-summary__label">Total:</span>
            <span className="assign-fine-summary__value">
              {selectedRule ? formatAmount(selectedRule.amount * selectedTargets.length) : "-"}
            </span>
          </div>
        </div>

        {duplicateWarning && (
          <div className="app-card border border-amber-300 bg-amber-50 p-3 text-amber-950">
            <p className="text-sm font-semibold">Mulig dobbelt bøde fundet</p>
            <p className="text-xs mt-1">
              {duplicateWarning.memberNames.join(", ")} har allerede fået “{duplicateWarning.ruleTitle}” i dag.
            </p>
            <button
              type="button"
              className="btn-secondary mt-3 w-full"
              disabled={submitting}
              onClick={(event) => {
                void handleSubmit(event as unknown as React.FormEvent<HTMLFormElement>, {
                  overrideDuplicates: true,
                });
              }}
            >
              Tildel alligevel
            </button>
          </div>
        )}

        {assignProgress && (
          <BulkOperationProgress
            completed={assignProgress.completed}
            total={assignProgress.total}
            operation="Tildeler bøder..."
          />
        )}

        {error && <p className="status-error">{error}</p>}

        <button type="submit" className="btn-primary assign-fine-submit" disabled={submitting}>
          {submitting
            ? "Tildeler..."
            : selectedTargets.length === 1
              ? "Tildel bøde"
              : `Tildel bøde til ${selectedTargets.length} spillere`}
        </button>
      </form>
    </div>
  );
}
