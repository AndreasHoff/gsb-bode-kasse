import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getActiveSeason,
  getMemberships,
  getUsers,
  getSeasonBalances,
  getPaymentsForReconciliation,
  getInterestChargesForSeason,
} from "../../lib/firestore";
import { formatAmount } from "../../lib/utils";
import type { Membership, User, Role, UserSeasonBalance } from "../../types/domain";
import "./team-overview.css";

interface TeamOverviewProps {
  teamId: string;
  onMemberSelect: (memberId: string, memberName: string) => void;
  userRole?: Role | null;
  onOpenAdminApprovals?: () => void;
}

type MemberRole = "admin" | "member";

type MemberStat = {
  user: User;
  totalDebt: number;
  paidAmount: number;
  totalIssued: number;
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

  const loadData = useCallback(async () => {
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

      // Fetch season balances (authoritative source of truth), payments for reconciliation, and interest charges
      const [seasonBalanceData, paymentsForReconciliation, interestCharges] = await Promise.all([
        getSeasonBalances(teamId, season.id),
        getPaymentsForReconciliation(teamId),
        getInterestChargesForSeason(teamId, season.id),
      ]);

      // Build lookup for user balances
      const balanceByUserId = new Map<string, UserSeasonBalance>();
      for (const balance of seasonBalanceData) {
        balanceByUserId.set(balance.userId, balance);
      }

      // Build lookup for user interest charges (excluding deleted ones)
      const interestByUserId = new Map<string, number>();
      for (const charge of interestCharges) {
        if (charge.deletedAt) continue;
        const current = interestByUserId.get(charge.userId) ?? 0;
        interestByUserId.set(charge.userId, current + charge.amount);
      }

      // Build lookup for pending/disputed statuses
      const userHasPending = new Set<string>();
      const userHasDisputed = new Set<string>();
      for (const payment of paymentsForReconciliation) {
        if (payment.status === "pending") {
          userHasPending.add(payment.userId);
        }
        if (payment.status === "disputed") {
          userHasDisputed.add(payment.userId);
        }
      }

      // Calculate team aggregates from member balances + interest charges
      // This ensures consistency: totalIssued = totalOwed + totalPaid
      let aggIssued = 0;
      let aggOwed = 0;
      let aggPaid = 0;
      
      // Sum all member balances
      for (const balance of seasonBalanceData) {
        aggIssued += balance.outstandingBalance + balance.pendingBalance + balance.approvedBalance;
        aggOwed += balance.outstandingBalance + balance.pendingBalance;
        aggPaid += balance.approvedBalance;
      }
      
      // Add unpaid interest charges to both issued and owed
      for (const interestAmount of interestByUserId.values()) {
        aggIssued += interestAmount;
        aggOwed += interestAmount;
      }

      setTotalIssued(aggIssued);
      setTotalOwed(aggOwed);
      setTotalPaid(aggPaid);

      const stats: MemberStat[] = users.map((user) => {
        const balance = balanceByUserId.get(user.id);
        const membership = membershipByUserId.get(user.id);
        const role: MemberRole = membership?.role === "admin" ? "admin" : "member";

        // totalDebt = outstanding + pending (both are unpaid) + unpaid interest charges
        const baseDebt = (balance?.outstandingBalance ?? 0) + (balance?.pendingBalance ?? 0);
        const interestDebt = interestByUserId.get(user.id) ?? 0;
        const totalDebt = baseDebt + interestDebt;
        const paidAmount = balance?.approvedBalance ?? 0;

        // totalIssued = all fines issued (paid + unpaid) + interest
        const totalIssued = totalDebt + paidAmount;

        return {
          user,
          totalDebt,
          paidAmount,
          totalIssued,
          role,
          hasPending: userHasPending.has(user.id),
          hasDisputed: userHasDisputed.has(user.id),
        };
      });

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

  useEffect(() => {
    function refreshOnVisible(): void {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    }

    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [loadData]);

  const sortedMembers = useMemo(
    () => [...memberStats].sort((a, b) => b.totalDebt - a.totalDebt),
    [memberStats],
  );

  const topIssuedMembers = useMemo(
    () => [...memberStats].sort((a, b) => b.totalIssued - a.totalIssued),
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

          {/* Podium - Top 3 members by total issued fines */}
          {sortedMembers.length >= 3 && topIssuedMembers.some(m => m.totalIssued > 0) && (
            <div className="podium">
              {topIssuedMembers.slice(0, 3).map((item, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                const initials = item.user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <div key={item.user.id} className={`podium-slot podium-slot--rank-${idx + 1}`}>
                    <div className="podium-rank">{medal}</div>
                    <div className="podium-avatar">{initials}</div>
                    <div className="podium-name">{item.user.name}</div>
                    <div className="podium-amount">{formatAmount(item.totalIssued)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Celebration when all debts cleared */}
          {totalOwed === 0 && totalPaid > 0 && (
            <div className="celebration-card">
              <p className="celebration-card__emoji">🎉</p>
              <p className="celebration-card__title">Alle bøder betalt!</p>
              <p className="celebration-card__text">
                Hele holdet har betalt deres bøder. Kassen har {formatAmount(totalPaid)}!
              </p>
            </div>
          )}

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
            <h2 className="member-list-header">Medlemmer ({sortedMembers.length})</h2>
            <ul className="team-member-list">
              {sortedMembers.map((item) => {
                const initials = item.user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const roleLabel =
                  item.role === "admin"
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
                          <p className="team-member-info__name">
                            {item.user.name}
                            {item.hasPending && <span className="badge badge--pending">Afventer</span>}
                          </p>
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
