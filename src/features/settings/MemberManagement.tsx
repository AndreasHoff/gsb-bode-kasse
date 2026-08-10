// Feature: Member Management (F022)
// Admin can view all members, change roles, and remove members (cascading their fines).

import { useCallback, useEffect, useState } from "react";
import type { Membership, User, Role } from "../../types/domain";
import {
  getMemberships,
  getUsers,
  upsertMembership,
  removeMember,
} from "../../lib/firestore";

interface MemberRow {
  membership: Membership;
  user: User;
}

interface ConfirmRemove {
  userId: string;
  name: string;
}

interface Props {
  teamId: string;
  actorId: string;
}

export default function MemberManagement({ teamId, actorId }: Props) {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ConfirmRemove | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [memberships, users] = await Promise.all([
        getMemberships(teamId),
        getUsers(),
      ]);
      const activeMembers = memberships.filter((m) => m.isActive);
      const userMap = new Map(users.map((u) => [u.id, u]));
      const combined: MemberRow[] = activeMembers
        .map((m) => ({ membership: m, user: userMap.get(m.userId) }))
        .filter((r): r is MemberRow => r.user !== undefined)
        .sort((a, b) => a.user.name.localeCompare(b.user.name, "da"));
      setRows(combined);
    } catch {
      setError("Kunne ikke hente medlemmer.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRoleChange(userId: string, newRole: Role): Promise<void> {
    if (processingId) return;

    // Guard: cannot demote last admin
    if (newRole === "member") {
      const adminCount = rows.filter((r) => r.membership.role === "admin").length;
      if (adminCount <= 1) {
        setError("Holdet skal have mindst én admin.");
        return;
      }
    }

    setProcessingId(userId);
    setError(null);
    try {
      const row = rows.find((r) => r.membership.userId === userId);
      if (!row) return;
      await upsertMembership(
        { ...row.membership, role: newRole },
        actorId,
        "member.roleChanged",
      );
      setRows((prev) =>
        prev.map((r) =>
          r.membership.userId === userId
            ? { ...r, membership: { ...r.membership, role: newRole } }
            : r,
        ),
      );
    } catch {
      setError("Rolleændring mislykkedes.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRemoveConfirmed(): Promise<void> {
    if (!confirmRemove || processingId) return;
    const { userId } = confirmRemove;

    setProcessingId(userId);
    setError(null);
    setConfirmRemove(null);
    try {
      await removeMember(teamId, userId, actorId);
      setRows((prev) => prev.filter((r) => r.membership.userId !== userId));
    } catch {
      setError("Fjernelse af medlem mislykkedes.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleRemoveClick(userId: string, name: string): void {
    if (userId === actorId) {
      setError("Du kan ikke fjerne dig selv.");
      return;
    }
    setConfirmRemove({ userId, name });
  }

  if (loading) {
    return <p className="p-4 text-sm text-[var(--color-text-muted)]">Henter medlemmer…</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
        Spillere ({rows.length})
      </h2>

      {error && (
        <p className="status-error mb-3">{error}</p>
      )}

      {rows.length === 0 ? (
        <div className="empty-state py-8">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm">Ingen aktive medlemmer.</p>
        </div>
      ) : (
        <ul className="member-management__list">
          {rows.map(({ membership, user }) => {
            const isProcessing = processingId === user.id;
            const isCurrentUser = user.id === actorId;
            const isConfirming = confirmRemove?.userId === user.id;

            return (
              <li key={user.id}>
                <div className="member-management__item">
                  <div className="member-management__info">
                    <p className="member-management__name">
                      {user.name}
                      {isCurrentUser && (
                        <span className="text-[var(--color-text-muted)] font-normal text-xs ml-1">
                          (dig)
                        </span>
                      )}
                    </p>
                    <span
                      className={`member-management__role ${
                        membership.role === "member"
                          ? "member-management__role--member"
                          : ""
                      }`}
                    >
                      {membership.role === "admin" ? "Admin" : "Medlem"}
                    </span>
                  </div>

                  {!isCurrentUser && (
                    <div className="member-management__actions">
                      {membership.role === "member" ? (
                        <button
                          type="button"
                          className="member-management__action-btn"
                          disabled={isProcessing || !!processingId}
                          onClick={() => void handleRoleChange(user.id, "admin")}
                        >
                          Gør til admin
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="member-management__action-btn"
                          disabled={isProcessing || !!processingId}
                          onClick={() => void handleRoleChange(user.id, "member")}
                        >
                          Gør til medlem
                        </button>
                      )}
                      <button
                        type="button"
                        className="member-management__action-btn member-management__action-btn--danger"
                        disabled={isProcessing || !!processingId}
                        onClick={() => handleRemoveClick(user.id, user.name)}
                      >
                        Fjern
                      </button>
                    </div>
                  )}
                </div>

                {isConfirming && (
                  <div className="member-management__confirm">
                    <p>
                      Er du sikker? Alle <strong>{user.name}</strong>s bøder slettes også.
                    </p>
                    <div className="member-management__confirm-actions">
                      <button
                        type="button"
                        className="btn-danger flex-1"
                        disabled={isProcessing}
                        onClick={() => void handleRemoveConfirmed()}
                      >
                        {isProcessing ? "Fjerner…" : "Ja, fjern"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary flex-1"
                        disabled={isProcessing}
                        onClick={() => setConfirmRemove(null)}
                      >
                        Annuller
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
