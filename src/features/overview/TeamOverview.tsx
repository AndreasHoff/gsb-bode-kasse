import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getActiveSeason,
  getFines,
  getMemberships,
  getPayments,
  getUsers,
} from "../../lib/firestore";
import { formatAmount } from "../../lib/utils";
import type { Membership, User, Role } from "../../types/domain";
import "./team-overview.css";

interface TeamOverviewProps {
  teamId: string;
  onMemberSelect: (memberId: string, memberName: string) => void;
  userRole?: Role | null;
  isSuperAdmin?: boolean;
  onOpenAdminApprovals?: () => void;
}

type MemberRole = "super-admin" | "admin" | "member";

type MemberStat = {
  user: User;
  totalDebt: number;
  paidAmount: number;
  role: MemberRole;
  hasPending?: boolean;
  hasDisputed?: boolean;
};

export default function TeamOverview({ teamId, onMemberSelect }: TeamOverviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noSeason, setNoSeason] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [totalIssued, setTotalIssued] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const loadData = useCallback(async () => {
    // Demo mode: render deterministic sample data when URL contains ?demo=1
    const demoMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "1";

    if (demoMode) {
      const now = new Date().toISOString();
      const demoUsers = [
        { id: "u1", name: "Anna Hansen", email: "anna@example.com", createdAt: now },
        { id: "u2", name: "Mikkel Jensen", email: "mikkel@example.com", createdAt: now },
        { id: "u3", name: "Jonas Sørensen", email: "jonas@example.com", createdAt: now },
        { id: "u4", name: "Laura Møller", email: "laura@example.com", createdAt: now },
        { id: "u5", name: "Peter Larsen", email: "peter@example.com", createdAt: now },
      ];

      const demoStats: MemberStat[] = [
        { user: demoUsers[0], totalDebt: 520, paidAmount: 0, role: "member", hasPending: true },
        { user: demoUsers[1], totalDebt: 310, paidAmount: 0, role: "admin", hasPending: true },
        { user: demoUsers[2], totalDebt: 120, paidAmount: 0, role: "member" },
        { user: demoUsers[3], totalDebt: 0, paidAmount: 200, role: "member" },
        { user: demoUsers[4], totalDebt: 0, paidAmount: 0, role: "member" },
      ];

      setMemberStats(demoStats);
      setTotalIssued(1150);
      setTotalOwed(950);
      setTotalPaid(200);
      setPendingCount(2);
      setNoSeason(false);
      setIsLoading(false);
      return;
    }

    if (!teamId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [season, users, memberships] = await Promise.all([
        getActiveSeason(teamId),
        getUsers(),
        getMemberships(teamId),
      ]);

      const membershipByUserId = new Map<string, Membership>();
      for (const m of memberships) {
        membershipByUserId.set(m.userId, m);
      }

      if (!season) {
        setNoSeason(true);
        setMemberStats([]);
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

      type UserAcc = { debt: number; paid: number };
      const accByUser = new Map<string, UserAcc>();
      for (const user of users) {
        accByUser.set(user.id, { debt: 0, paid: 0 });
      }

      let aggIssued = 0;
      let aggOwed = 0;
      let aggPaid = 0;

      let pendingCounter = 0;
      let disputedCounter = 0;

      for (const payment of payments) {
        if (!seasonFineIds.has(payment.fineId)) continue;

        const acc = accByUser.get(payment.userId);

        if (payment.status === "approved") {
          aggPaid += payment.amount;
          if (acc) acc.paid += payment.amount;
        } else if (
          payment.status === "unpaid" ||
          payment.status === "pending" ||
          payment.status === "disputed"
        ) {
          aggOwed += payment.amount;
          if (acc) acc.debt += payment.amount;
        }

        if (payment.status === "pending") {
          pendingCounter += payment.amount;
          if (acc) acc.hasPending = true;
        }

        if (payment.status === "disputed") {
          disputedCounter += payment.amount;
          if (acc) acc.hasDisputed = true;
        }

        aggIssued += payment.amount;
      }

      setTotalIssued(aggIssued);
      setTotalOwed(aggOwed);
      setTotalPaid(aggPaid);

      const stats: MemberStat[] = users.map((user) => {
        const acc = accByUser.get(user.id) ?? { debt: 0, paid: 0, hasPending: false, hasDisputed: false } as any;
        const membership = membershipByUserId.get(user.id);
        const role: MemberRole = user.isSuperAdmin
          ? "super-admin"
          : membership?.role === "admin"
            ? "admin"
            : "member";
        return {
          user,
          totalDebt: acc.debt,
          paidAmount: acc.paid,
          role,
          hasPending: !!acc.hasPending,
          hasDisputed: !!acc.hasDisputed,
        };
      });

      setPendingCount(pendingCounter);

      setMemberStats(stats);
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
    () => [...memberStats].sort((a, b) => b.totalDebt - a.totalDebt),
    [memberStats],
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
          {/* Bødekasse Saldo header card */}
          <div className="team-saldo-card">
            <p className="team-saldo-card__label">Bødekasse Saldo</p>
            <p className="team-saldo-card__value">{formatAmount(totalPaid)}</p>
          </div>

          {/* 3 stat cards */}
          <div className="team-stats">
            <div className="team-stat-card">
              <span className="team-stat-card__emoji">📋</span>
              <span className="team-stat-card__label">Udstedt bøder</span>
              <span className="team-stat-card__value">{formatAmount(totalIssued)}</span>
            </div>
            <div className="team-stat-card team-stat-card--owed">
              <span className="team-stat-card__emoji">⏳</span>
              <span className="team-stat-card__label">Skyldigt</span>
              <span className="team-stat-card__value">{formatAmount(totalOwed)}</span>
            </div>
            <div className="team-stat-card team-stat-card--paid">
              <span className="team-stat-card__emoji">✅</span>
              <span className="team-stat-card__label">Indbetalt</span>
              <span className="team-stat-card__value">{formatAmount(totalPaid)}</span>
            </div>
          </div>

          {/* Member list */}
          <section aria-label="Holdoversigt">
            <ul className="team-member-list">
              {sortedMembers.map((item) => {
                const initials = item.user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const roleLabel =
                  item.role === "super-admin"
                    ? "Super Admin"
                    : item.role === "admin"
                      ? "Admin"
                      : "Medlem";
                return (
                  <li key={item.user.id}>
                    <button
                      type="button"
                      className="team-member-row"
                      onClick={() => onMemberSelect(item.user.id, item.user.name)}
                    >
                      <div className="team-member-row__left">
                        <div className="team-member-avatar">{initials || "👤"}</div>
                        <div className="team-member-info">
                          <p className="team-member-info__name">{item.user.name}</p>
                          <p className="team-member-info__role">{roleLabel}</p>
                        </div>
                      </div>
                      <div className="team-member-row__right">
                        {item.totalDebt > 0 ? (
                          <>
                            <p className="team-member-saldo team-member-saldo--owed">
                              {formatAmount(item.totalDebt)}
                            </p>
                            <p className="team-member-saldo__sub">skylder</p>
                          </>
                        ) : item.paidAmount > 0 ? (
                          <>
                            <p className="team-member-saldo team-member-saldo--paid">
                              {formatAmount(item.paidAmount)}
                            </p>
                            <p className="team-member-saldo__sub">betalt ✓</p>
                          </>
                        ) : (
                          <p className="team-member-saldo team-member-saldo--zero">0 kr.</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
