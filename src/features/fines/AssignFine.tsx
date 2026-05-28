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
import type { FineRule, Membership, Role, User } from "../../types/domain";
import {
  assignFineWithPayment,
  getFineRules,
  getMemberships,
  getUsers,
} from "../../lib/firestore";
// TODO(season): re-enable season-based logic when season management is active
// import type { Season } from "../../types/domain";
// import { getActiveSeason } from "../../lib/firestore";
import { canAssignFines } from "../../lib/permissions";
import { formatAmount } from "../../lib/utils";

interface AssignFineProps {
  teamId: string;
  actorId: string;
  actorRole: Role | null;
  isSuperAdmin: boolean;
  onAssigned: (payload: { fineId: string; memberName: string }) => void;
}

export default function AssignFine({
  teamId,
  actorId,
  actorRole,
  isSuperAdmin,
  onAssigned,
}: AssignFineProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // TODO(season): re-enable season state when season management is active
  // const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [rules, setRules] = useState<FineRule[]>([]);
  const [members, setMembers] = useState<User[]>([]);

  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [note, setNote] = useState("");

  const hasPermission = canAssignFines(actorRole, isSuperAdmin);

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
        const [allRules, memberships, users] = await Promise.all([
          // TODO(season): add getActiveSeason(teamId) here when season management is active
          getFineRules(teamId),
          getMemberships(teamId),
          getUsers(),
        ]);

        if (!isActive) {
          return;
        }

        // TODO(season): setActiveSeason(season) when season management is active
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!hasPermission) {
      setError("Du har ikke adgang til at tildele bøder.");
      return;
    }

    // TODO(season): restore !activeSeason guard when season management is active
    if (!teamId || !actorId || !selectedRule) {
      return;
    }

    const targetUser = members.find((member) => member.id === selectedUserId);
    if (!targetUser) {
      setError("Vælg en gyldig spiller.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { fine } = await assignFineWithPayment(
        {
          teamId,
          // TODO(season): use activeSeason.id when season management is active
          seasonId: "dev-no-season",
          fineRuleId: selectedRule.id,
          title: selectedRule.title,
          amount: selectedRule.amount,
          assignedTo: [targetUser.id],
          assignedBy: actorId,
          note: note.trim() || undefined,
          isShared: false,
        },
        actorId,
      );

      setNote("");
      onAssigned({ fineId: fine.id, memberName: targetUser.name });
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
      <div className="app-page">
        <h1 className="app-title">Giv bøde</h1>
        <p className="status-error mt-4">Kun admins kan tildele bøder.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-page">
        <h1 className="app-title">Giv bøde</h1>
        <p className="status-note mt-4">Henter bødetyper og medlemmer...</p>
      </div>
    );
  }

  // TODO(season): restore season guard when season management is active
  // if (!activeSeason) { ... }

  if (rules.length === 0) {
    return (
      <div className="app-page">
        <h1 className="app-title">Giv bøde</h1>
        <div className="empty-state mt-6">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-semibold">Ingen aktive bødetyper</p>
          <p className="text-xs mt-2">Gå til fanen "Bøder" og opret mindst én bødetype.</p>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="app-page">
        <h1 className="app-title">Giv bøde</h1>
        <div className="empty-state mt-6">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm font-semibold">Ingen aktive medlemmer</p>
          <p className="text-xs mt-2">Tilføj medlemmer til holdet før du kan tildele bøder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page pb-8">
      <h1 className="app-title">Giv bøde</h1>
      <p className="app-subtitle mb-6">Tildel en bøde til én spiller</p>

      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="app-card p-4 flex flex-col gap-4"
      >
        <div>
          <label htmlFor="assign-rule" className="block text-sm font-semibold mb-1">
            Bødetype
          </label>
          <select
            id="assign-rule"
            className="field__input"
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

        <div>
          <label htmlFor="assign-member" className="block text-sm font-semibold mb-1">
            Spiller
          </label>
          <select
            id="assign-member"
            className="field__input"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            disabled={submitting}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assign-note" className="block text-sm font-semibold mb-1">
            Notat (valgfri)
          </label>
          <textarea
            id="assign-note"
            className="field__input"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={submitting}
            placeholder="F.eks. kom 10 minutter for sent"
          />
        </div>

        {error && <p className="status-error">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Tildeler..." : "Tildel bøde"}
        </button>
      </form>
    </div>
  );
}
