import { useEffect, useState } from "react";
import type { Role, Season, User } from "../../types/domain";
import {
  awardTournamentCredit,
  getActiveSeason,
  getMemberships,
  getUsers,
} from "../../lib/firestore";
import { canAssignFines } from "../../lib/permissions";
import { formatAmount } from "../../lib/utils";
import "./award-tournament-credit.css";

interface AwardTournamentCreditProps {
  teamId: string;
  actorId: string;
  actorRole: Role | null;
  onAwarded: (payload: { memberName: string; appliedImmediately: boolean }) => void;
}

export default function AwardTournamentCredit({
  teamId,
  actorId,
  actorRole,
  onAwarded,
}: AwardTournamentCreditProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [members, setMembers] = useState<User[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");

  const hasPermission = canAssignFines(actorRole);

  useEffect(() => {
    let isActive = true;

    async function loadCreditData(): Promise<void> {
      if (!teamId) {
        setError("Intet hold valgt.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [season, memberships, users] = await Promise.all([
          getActiveSeason(teamId),
          getMemberships(teamId),
          getUsers(),
        ]);

        if (!isActive) {
          return;
        }

        setActiveSeason(season);

        const activeMemberships = memberships.filter((member) => member.isActive);
        const activeMemberIds = new Set(activeMemberships.map((member) => member.userId));

        const activeUsers = users
          .filter((user) => activeMemberIds.has(user.id))
          .sort((a, b) => a.name.localeCompare(b.name, "da", { sensitivity: "base" }));

        setMembers(activeUsers);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "En fejl opstod");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadCreditData();
    return () => {
      isActive = false;
    };
  }, [teamId]);

  async function handleAward(): Promise<void> {
    if (!activeSeason) {
      setError("Der er ingen aktiv sæson.");
      return;
    }

    if (!selectedUserId) {
      setError("Vælg venligst et medlem.");
      return;
    }

    const selectedMember = members.find((u) => u.id === selectedUserId);
    if (!selectedMember) {
      setError("Medlemmet blev ikke fundet.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await awardTournamentCredit(
        teamId,
        selectedUserId,
        activeSeason.id,
        actorId,
      );

      setSuccessMessage(
        result.appliedImmediately
          ? `Turnering kredit på ${formatAmount(35)} blev brugt til at reducere gælden.`
          : `Turnering kredit på ${formatAmount(35)} blev gemt til næste bøde.`,
      );

      onAwarded({
        memberName: selectedMember.name,
        appliedImmediately: result.appliedImmediately,
      });

      // Reset form
      setSelectedUserId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke tildele turneringskredit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission) {
    return (
      <div className="award-credit">
        <p className="status-error">Du har ikke tilladelse til at tildele turneringskreditter.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="award-credit">
        <p>Indlæser...</p>
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="award-credit">
        <p className="status-error">Ingen aktiv sæson. Opret eller aktivér en sæson først.</p>
      </div>
    );
  }

  return (
    <div className="award-credit">
      <h2 className="app-subtitle">Tildel turnering kredit</h2>

      {error && <p className="status-error mt-2">{error}</p>}
      {successMessage && <p className="status-success mt-2">{successMessage}</p>}

      <div className="award-credit__form mt-4">
        <div className="form-group">
          <label htmlFor="member-select" className="form-label">
            Medlem
          </label>
          <select
            id="member-select"
            className="form-input"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={submitting}
          >
            <option value="">-- Vælg medlem --</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <p className="form-label">Kredit beløb</p>
          <p className="text-sm">{formatAmount(35)}</p>
        </div>

        <button
          type="button"
          className="btn-primary w-full mt-4"
          onClick={() => {
            void handleAward();
          }}
          disabled={submitting || !selectedUserId}
        >
          {submitting ? "Tildeler..." : "Tildel kredit"}
        </button>
      </div>
    </div>
  );
}
