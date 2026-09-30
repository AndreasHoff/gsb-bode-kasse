import { useCallback, useEffect, useMemo, useState } from "react";
import type { InterestCharge, User, Season, Payment } from "../../types/domain";
import {
  getActiveSeason,
  getInterestChargesForSeason,
  getUsers,
  getTeam,
  getPayments,
} from "../../lib/firestore";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import "./interest-charges.css";

interface AdminInterestChargesProps {
  teamId: string;
}

type MemberInterestSummary = {
  userId: string;
  userName: string;
  chargeCount: number;
  totalAmount: number;
  months: string[];
  charges: InterestCharge[];
};

export default function AdminInterestCharges({ teamId }: AdminInterestChargesProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [charges, setCharges] = useState<InterestCharge[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [activeSeason, users, allPayments] = await Promise.all([
        getActiveSeason(teamId),
        getUsers(),
        getPayments(teamId),
      ]);

      if (!activeSeason) {
        setError("Ingen aktiv sæson fundet");
        setSeason(null);
        setCharges([]);
        setPayments([]);
        setLoading(false);
        return;
      }

      const seasonCharges = await getInterestChargesForSeason(teamId, activeSeason.id);

      setSeason(activeSeason);
      setCharges(seasonCharges);
      setPayments(allPayments);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Ukendt fejl";
      setError(`Kunne ikke hente rentegebyr (${message}).`);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Build summary data
  const memberSummaries = useMemo(() => {
    // Build a set of approved interest charge IDs (paid charges)
    const approvedInterestChargeIds = new Set<string>();
    for (const payment of payments) {
      if (payment.status === "approved" && payment.interestChargeIds) {
        for (const chargeId of payment.interestChargeIds) {
          approvedInterestChargeIds.add(chargeId);
        }
      }
    }

    // Filter charges to only unpaid ones
    const unpaidCharges = charges.filter(
      (charge) => !approvedInterestChargeIds.has(charge.id)
    );

    const summaryMap = new Map<string, MemberInterestSummary>();

    for (const charge of unpaidCharges) {
      const existing = summaryMap.get(charge.userId);
      const months = existing?.months ?? [];

      if (!months.includes(charge.month)) {
        months.push(charge.month);
      }

      summaryMap.set(charge.userId, {
        userId: charge.userId,
        userName: existing?.userName ?? "Henter navn...",
        chargeCount: (existing?.chargeCount ?? 0) + 1,
        totalAmount: (existing?.totalAmount ?? 0) + charge.amount,
        months,
        charges: [...(existing?.charges ?? []), charge],
      });
    }

    return Array.from(summaryMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [charges, payments]);

  // Build set of approved interest charge IDs (paid charges)
  const approvedInterestChargeIds = useMemo(() => {
    const set = new Set<string>();
    for (const payment of payments) {
      if (payment.status === "approved" && payment.interestChargeIds) {
        for (const chargeId of payment.interestChargeIds) {
          set.add(chargeId);
        }
      }
    }
    return set;
  }, [payments]);

  // Filter to unpaid charges only
  const unpaidCharges = useMemo(
    () => charges.filter((charge) => !approvedInterestChargeIds.has(charge.id)),
    [charges, approvedInterestChargeIds]
  );

  const totalMembersWithInterest = memberSummaries.length;
  const totalInterestCharges = unpaidCharges.length;
  const totalInterestAmount = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);

  const selectedMemberSummary = selectedMemberId
    ? memberSummaries.find((s) => s.userId === selectedMemberId)
    : null;

  return (
    <div className="interest-charges-admin">
      <h1 className="app-title">Rentegebyr</h1>
      <p className="app-subtitle mb-4">
        {season ? `${season.name}` : "Ingen aktiv sæson"}
      </p>

      {error && <p className="status-error mb-4">{error}</p>}

      {loading && <p className="status-note">Henter rentegebyr...</p>}

      {!loading && !error && (
        <>
          <div className="interest-stats">
            <div className="interest-stat-card">
              <span className="interest-stat-card__emoji">👥</span>
              <span className="interest-stat-card__label">Medlemmer med rente</span>
              <span className="interest-stat-card__value">{totalMembersWithInterest}</span>
            </div>
            <div className="interest-stat-card">
              <span className="interest-stat-card__emoji">📊</span>
              <span className="interest-stat-card__label">Rentegebyrer i alt</span>
              <span className="interest-stat-card__value">{totalInterestCharges}</span>
            </div>
            <div className="interest-stat-card">
              <span className="interest-stat-card__emoji">💰</span>
              <span className="interest-stat-card__label">Samlet rentegebyr</span>
              <span className="interest-stat-card__value">
                {formatAmount(totalInterestAmount)}
              </span>
            </div>
          </div>

          {memberSummaries.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__emoji">✅</span>
              <p className="empty-state__text">Ingen medlemmer med rentegebyr</p>
            </div>
          )}

          {memberSummaries.length > 0 && !selectedMemberSummary && (
            <section className="interest-list-section">
              <h2 className="interest-list-section__title">Medlemmer</h2>
              <div className="interest-member-list">
                {memberSummaries.map((summary) => (
                  <button
                    key={summary.userId}
                    type="button"
                    className="interest-member-card"
                    onClick={() => setSelectedMemberId(summary.userId)}
                  >
                    <div className="interest-member-card__info">
                      <p className="interest-member-card__name">{summary.userName}</p>
                      <p className="interest-member-card__meta">
                        {summary.chargeCount} gebyr · {summary.months.join(", ")}
                      </p>
                    </div>
                    <p className="interest-member-card__amount">
                      {formatAmount(summary.totalAmount)}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {selectedMemberSummary && (
            <section className="interest-detail-section">
              <button
                type="button"
                className="interest-back-btn"
                onClick={() => setSelectedMemberId(null)}
              >
                ← Tilbage til liste
              </button>

              <h2 className="interest-detail-section__title">
                {selectedMemberSummary.userName}
              </h2>
              <p className="interest-detail-section__meta">
                {selectedMemberSummary.chargeCount} rentegebyr
              </p>

              <div className="interest-charge-list">
                {selectedMemberSummary.charges
                  .sort((a, b) => b.chargedOn.localeCompare(a.chargedOn))
                  .map((charge) => (
                    <article key={charge.id} className="interest-charge-card">
                      <div className="interest-charge-card__header">
                        <div className="interest-charge-card__info">
                          <p className="interest-charge-card__month">
                            Rente fra {charge.month}
                          </p>
                          <p className="interest-charge-card__meta">
                            Opkrævet {formatRelativeTime(charge.createdAt)}
                          </p>
                        </div>
                        <p className="interest-charge-card__amount">
                          {formatAmount(charge.amount)}
                        </p>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
