import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getActiveSeason,
  getActivityLogEntries,
  getFines,
  getPayments,
  getUsers,
} from "../../lib/firestore";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import type { ActivityLog, User } from "../../types/domain";

interface TeamOverviewProps {
  teamId: string;
  onMemberSelect: (memberId: string, memberName: string) => void;
}

type MemberDebt = {
  user: User;
  totalDebt: number;
  unpaidCount: number;
  hasPending: boolean;
  hasDisputed: boolean;
};

export default function TeamOverview({ teamId, onMemberSelect }: TeamOverviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noSeason, setNoSeason] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [memberDebts, setMemberDebts] = useState<MemberDebt[]>([]);
  const [activityEntries, setActivityEntries] = useState<ActivityLog[]>([]);
  const [usersById, setUsersById] = useState<Map<string, User>>(new Map());

  const loadData = useCallback(async () => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [season, users, activityPage] = await Promise.all([
        getActiveSeason(teamId),
        getUsers(),
        getActivityLogEntries(teamId, 10),
      ]);

      const userMap = new Map<string, User>();
      for (const user of users) {
        userMap.set(user.id, user);
      }
      setUsersById(userMap);
      setActivityEntries(activityPage.entries);

      if (!season) {
        setNoSeason(true);
        setMemberDebts([]);
        setIsLoading(false);
        return;
      }

      setNoSeason(false);
      setSeasonName(season.name);

      const [fines, payments] = await Promise.all([
        getFines(teamId),
        getPayments(teamId),
      ]);

      const seasonFineIds = new Set<string>();
      for (const fine of fines) {
        if (fine.seasonId === season.id) {
          seasonFineIds.add(fine.id);
        }
      }

      type DebtAcc = { total: number; unpaidFineIds: Set<string>; hasPending: boolean; hasDisputed: boolean };
      const debtByUser = new Map<string, DebtAcc>();
      for (const user of users) {
        debtByUser.set(user.id, { total: 0, unpaidFineIds: new Set(), hasPending: false, hasDisputed: false });
      }

      for (const payment of payments) {
        if (!seasonFineIds.has(payment.fineId)) continue;
        if (
          payment.status !== "unpaid" &&
          payment.status !== "pending" &&
          payment.status !== "disputed"
        ) continue;

        const acc = debtByUser.get(payment.userId);
        if (!acc) continue;

        acc.total += payment.amount;
        acc.unpaidFineIds.add(payment.fineId);
        if (payment.status === "pending") acc.hasPending = true;
        if (payment.status === "disputed") acc.hasDisputed = true;
      }

      const debts: MemberDebt[] = users.map((user) => {
        const acc = debtByUser.get(user.id) ?? {
          total: 0,
          unpaidFineIds: new Set<string>(),
          hasPending: false,
          hasDisputed: false,
        };
        return {
          user,
          totalDebt: acc.total,
          unpaidCount: acc.unpaidFineIds.size,
          hasPending: acc.hasPending,
          hasDisputed: acc.hasDisputed,
        };
      });

      setMemberDebts(debts);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      setErrorMessage(`Kunne ikke hente holdoversigt (${message}).`);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedMembers = useMemo(
    () => [...memberDebts].sort((a, b) => b.totalDebt - a.totalDebt),
    [memberDebts],
  );

  const allZeroDebt = useMemo(
    () => sortedMembers.length > 0 && sortedMembers.every((m) => m.totalDebt === 0),
    [sortedMembers],
  );

  return (
    <div className="app-page">
      <h1 className="app-title">Hold</h1>
      <p className="app-subtitle mb-6">{seasonName || "Holdets oversigt"}</p>

      {isLoading && <p className="status-note">Henter data...</p>}

      {errorMessage && <p className="status-error">{errorMessage}</p>}

      {!isLoading && !errorMessage && noSeason && (
        <div className="empty-state py-8">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm font-medium">Ingen aktiv sæson</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            En admin skal oprette en sæson, før bøder kan tildeles.
          </p>
        </div>
      )}

      {!isLoading && !errorMessage && !noSeason && sortedMembers.length === 0 && (
        <div className="empty-state py-8">
          <p className="text-4xl mb-3">🏸</p>
          <p className="text-sm">Ingen medlemmer endnu.</p>
        </div>
      )}

      {!isLoading && !errorMessage && !noSeason && sortedMembers.length > 0 && (
        <>
          {allZeroDebt && (
            <div className="text-center py-4 mb-4 rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] border border-[var(--color-border)]">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Alle er i det grønne!
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Ingen udestående bøder på holdet.
              </p>
            </div>
          )}

          <section aria-label="Gældsrangordning">
            <ul className="space-y-2">
              {sortedMembers.map((item, index) => (
                <li key={item.user.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface-muted)_72%,transparent)] px-3 py-3 active:opacity-80 transition-opacity"
                    onClick={() => onMemberSelect(item.user.id, item.user.name)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[var(--color-text-muted)] w-5 text-center font-mono shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                          {item.user.name}
                        </p>
                        {item.unpaidCount > 0 && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {item.unpaidCount}{" "}
                            {item.unpaidCount === 1 ? "bøde" : "bøder"}
                            {item.hasPending && " ⏳"}
                            {item.hasDisputed && " ⚠️"}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {item.totalDebt > 0 ? (
                          <p className="text-base font-bold text-[var(--color-primary)]">
                            {formatAmount(item.totalDebt)}
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--color-text-muted)]">0 kr.</p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {activityEntries.length > 0 && (
            <section className="mt-6" aria-label="Seneste aktivitet">
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                Seneste aktivitet
              </h2>
              <ul className="space-y-2">
                {activityEntries.map((entry) => (
                  <li key={entry.id} className="app-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_16%,transparent)] flex items-center justify-center text-xs shrink-0">
                        {getActionIcon(entry.action)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--color-text)]">
                          {getActionText(entry, usersById.get(entry.actorId) ?? null, usersById)}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {formatActivityTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function formatActivityTime(createdAt: string): string {
  const created = new Date(createdAt);
  const diffMs = Date.now() - created.getTime();
  if (diffMs < 3_600_000) {
    return formatRelativeTime(createdAt);
  }
  return created.toLocaleString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionIcon(action: string): string {
  if (action === "fine.assigned") return "🎯";
  if (action === "fine.deleted") return "🗑️";
  if (action === "fine.restored") return "↩️";
  if (action === "payment.created") return "🧾";
  if (action === "payment.initiated") return "💸";
  if (action === "payment.approved") return "✅";
  if (action === "payment.disputed") return "⚠️";
  if (action === "season.created") return "📅";
  if (action === "season.closed") return "🏁";
  if (action === "member.added") return "➕";
  if (action === "member.roleChanged") return "🛡️";
  if (action === "rule.created") return "📋";
  if (action === "rule.updated") return "✏️";
  if (action === "rule.deactivated") return "⏸️";
  return "📌";
}

function getActionText(entry: ActivityLog, actor: User | null, usersById: Map<string, User>): string {
  const actorName = actor?.name ?? "En bruger";
  const metadata = entry.metadata ?? {};

  function toStr(v: unknown): string | null {
    return typeof v === "string" && v.trim().length > 0 ? v : null;
  }

  function toNum(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  const title = toStr(metadata.title) ?? "en bøde";
  const amount = toNum(metadata.amount);
  const fmt = amount !== null ? ` (${formatAmount(amount)})` : "";

  if (entry.action === "fine.assigned") {
    const assignedTo = metadata.assignedTo;
    const recipientIds = Array.isArray(assignedTo) ? (assignedTo as string[]) : [];
    const recipientNames = recipientIds
      .map((id) => usersById.get(id)?.name ?? "en spiller")
      .join(", ");
    const toText = recipientIds.length > 0 ? ` til ${recipientNames}` : "";
    return `${actorName} tildelte ${title}${toText}${fmt}.`;
  }
  if (entry.action === "fine.deleted") return `${actorName} slettede ${title}${fmt}.`;
  if (entry.action === "fine.restored") return `${actorName} gendannede ${title}${fmt}.`;
  if (entry.action === "payment.created") {
    return `${actorName} oprettede en betalingslinje${amount !== null ? ` på ${formatAmount(amount)}` : ""}.`;
  }
  if (entry.action === "payment.disputed") {
    const payerName =
      typeof metadata.userId === "string"
        ? (usersById.get(metadata.userId as string)?.name ?? null)
        : null;
    const payerText = payerName ? `${payerName}s betaling` : "en betaling";
    return `${actorName} markerede ${payerText} som omtvistet.`;
  }
  if (entry.action === "payment.initiated")
    return `${actorName} har sendt en betaling${amount !== null ? ` på ${formatAmount(amount)}` : ""}.`;
  if (entry.action === "payment.approved") {
    const payerName =
      typeof metadata.userId === "string"
        ? (usersById.get(metadata.userId as string)?.name ?? null)
        : null;
    const payerText = payerName ? `${payerName}s betaling` : "en betaling";
    return `${actorName} godkendte ${payerText}${amount !== null ? ` – ${formatAmount(amount)}` : ""}.`;
  }
  if (entry.action === "season.created") return `${actorName} oprettede en ny sæson.`;
  if (entry.action === "season.closed") return `${actorName} lukkede den aktive sæson.`;
  if (entry.action === "rule.created")
    return `${actorName} oprettede bødetypen ${title}.`;
  if (entry.action === "rule.updated")
    return `${actorName} opdaterede bødetypen ${title}.`;
  if (entry.action === "rule.deactivated")
    return `${actorName} deaktiverede bødetypen ${title}.`;
  return `${actorName} udførte en handling.`;
}
