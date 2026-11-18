import { useCallback, useEffect, useMemo, useState } from "react";
import type { Fine, Payment, PaymentStatus, User, InterestCharge } from "../../types/domain";
import {
  getActiveSeason,
  getFinesForUser,
  getPaymentsForUser,
  getTeam,
  getUsers,
  createCombinedPayment,
  getInterestChargesForUser,
} from "../../lib/firestore";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import ClaimPaymentButton from "../profile/ClaimPaymentButton";
import "./personal-overview.css";

interface PersonalOverviewProps {
  teamId: string;
  userId: string;
  /** When set, renders in viewer mode (read-only, no pay buttons) showing this person's name */
  viewerName?: string;
}

type FineWithPayment = {
  fine: Fine;
  payment: Payment | null;
  assignedByName: string;
  effectiveStatus: PaymentStatus;
};

type InterestChargeRow = {
  charge: InterestCharge;
  effectiveStatus: PaymentStatus;
};

export default function PersonalOverview({ teamId, userId, viewerName }: PersonalOverviewProps) {
  const isViewerMode = !!viewerName;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobilePayBoxUrl, setMobilePayBoxUrl] = useState<string | null>(null);
  const [paidOpen, setPaidOpen] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  // Dialog state for MobilePay Box flow
  const [showPrePayDialog, setShowPrePayDialog] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    fineIds: string[];
    interestChargeIds: string[];
    amount: number;
    titles: string[];
  } | null>(null);

  const [fineRows, setFineRows] = useState<FineWithPayment[]>([]);
  const [interestCharges, setInterestCharges] = useState<InterestChargeRow[]>([]);

  // Storage key for persisting payment data across component lifecycle
  const paymentDataStorageKey = `gsb:pending-payment:${teamId}:${userId}`;

  /**
   * Helper to get fine IDs from a payment, handling backward compatibility.
   */
  function getFineIdsFromPayment(payment: Payment): string[] {
    if (payment.fineIds && payment.fineIds.length > 0) {
      return payment.fineIds;
    }
    if (payment.fineId) {
      return [payment.fineId];
    }
    return [];
  }

  const loadData = useCallback(async () => {
    if (!teamId || !userId) {
      setFineRows([]);
      setInterestCharges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [season, fines, payments, team, users, charges] = await Promise.all([
        getActiveSeason(teamId),
        getFinesForUser(teamId, userId),
        getPaymentsForUser(teamId, userId),
        getTeam(teamId),
        getUsers(),
        getInterestChargesForUser(teamId, userId),
      ]);

      const activeSeasonFines = season
        ? fines.filter((fine) => fine.seasonId === season.id)
        : [];

      // Filter interest charges to active season only
      const activeSeasonCharges = season
        ? charges.filter((charge) => charge.seasonId === season.id)
        : [];

      // Build a map of interest charge IDs that are in approved payments (paid interest)
      const approvedInterestChargeIds = new Set<string>();
      for (const payment of payments) {
        if (payment.status === "approved" && payment.interestChargeIds) {
          for (const chargeId of payment.interestChargeIds) {
            approvedInterestChargeIds.add(chargeId);
          }
        }
      }

      // Build a map of interest charge ID -> pending or claimed Payment (if any)
      const pendingPaymentByInterestChargeId = new Map<string, Payment>();
      for (const payment of payments) {
        if ((payment.status === "pending" || payment.status === "claimed") && payment.interestChargeIds) {
          for (const chargeId of payment.interestChargeIds) {
            pendingPaymentByInterestChargeId.set(chargeId, payment);
          }
        }
      }

      // Build a map of fineId -> pending or claimed Payment (if any)
      const pendingPaymentByFineId = new Map<string, Payment>();
      for (const payment of payments) {
        if (payment.status === "pending" || payment.status === "claimed") {
          const fineIds = getFineIdsFromPayment(payment);
          for (const fid of fineIds) {
            pendingPaymentByFineId.set(fid, payment);
          }
        }
      }

      // Build a map of fineId -> approved Payment (for status display)
      const approvedPaymentByFineId = new Map<string, Payment>();
      for (const payment of payments) {
        if (payment.status === "approved") {
          const fineIds = getFineIdsFromPayment(payment);
          for (const fid of fineIds) {
            approvedPaymentByFineId.set(fid, payment);
          }
        }
      }

      const userById = new Map<string, User>();
      for (const user of users) {
        userById.set(user.id, user);
      }

      const rows: FineWithPayment[] = activeSeasonFines
        .map((fine) => {
          const pendingPayment = pendingPaymentByFineId.get(fine.id);
          const approvedPayment = approvedPaymentByFineId.get(fine.id);
          const payment = pendingPayment || approvedPayment || null;
          const assignedByName = userById.get(fine.assignedBy)?.name ?? "Ukendt";

          let effectiveStatus: PaymentStatus = "unpaid";
          if (pendingPayment?.status === "pending") {
            effectiveStatus = "pending";  // Payment created, awaiting member claim
          } else if (pendingPayment?.status === "claimed") {
            effectiveStatus = "claimed";   // Payment claimed, awaiting admin approval
          } else if (approvedPayment) {
            effectiveStatus = "approved";
          }

          return {
            fine,
            payment,
            assignedByName,
            effectiveStatus,
          };
        })
        .sort((a, b) => b.fine.createdAt.localeCompare(a.fine.createdAt));

      // Build interest charge rows with status tracking (pending, claimed, unpaid, or approved)
      const chargeRows: InterestChargeRow[] = activeSeasonCharges
        .map((charge) => {
          if (approvedInterestChargeIds.has(charge.id)) {
            return { charge, effectiveStatus: "approved" as PaymentStatus };
          }
          const pendingPayment = pendingPaymentByInterestChargeId.get(charge.id);
          if (pendingPayment?.status === "pending") {
            return { charge, effectiveStatus: "pending" as PaymentStatus };
          }
          if (pendingPayment?.status === "claimed") {
            return { charge, effectiveStatus: "claimed" as PaymentStatus };
          }
          return { charge, effectiveStatus: "unpaid" as PaymentStatus };
        })
        .sort((a, b) => b.charge.chargedOn.localeCompare(a.charge.chargedOn));

      setFineRows(rows);
      setInterestCharges(chargeRows);
      setMobilePayBoxUrl(isViewerMode ? null : (team?.mobilePayBoxUrl?.trim() || null));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Ukendt fejl";
      setError(`Kunne ikke hente dine bøder (${message}).`);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, isViewerMode]);



  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    function refreshOnVisible(): void {
      if (document.visibilityState === "visible") {
        void loadData();
      }
    }

    function refreshOnFocus(): void {
      void loadData();
    }

    document.addEventListener("visibilitychange", refreshOnVisible);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      document.removeEventListener("visibilitychange", refreshOnVisible);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadData]);

  const unpaidRows = useMemo(
    () => fineRows.filter((row) => row.effectiveStatus === "unpaid"),
    [fineRows],
  );
  const unclaimedPendingRows = useMemo(
    () => fineRows.filter((row) => row.effectiveStatus === "pending"),
    [fineRows],
  );
  const claimedRows = useMemo(
    () => fineRows.filter((row) => row.effectiveStatus === "claimed"),
    [fineRows],
  );
  const paidRows = useMemo(
    () => fineRows.filter((row) => row.effectiveStatus === "approved"),
    [fineRows],
  );

  const unpaidInterestCharges = useMemo(
    () => interestCharges.filter((row) => row.effectiveStatus === "unpaid"),
    [interestCharges],
  );
  const unclaimedPendingInterestCharges = useMemo(
    () => interestCharges.filter((row) => row.effectiveStatus === "pending"),
    [interestCharges],
  );
  const claimedInterestCharges = useMemo(
    () => interestCharges.filter((row) => row.effectiveStatus === "claimed"),
    [interestCharges],
  );
  const approvedInterestCharges = useMemo(
    () => interestCharges.filter((row) => row.effectiveStatus === "approved"),
    [interestCharges],
  );

  const unpaidTotal = useMemo(() => {
    const finesTotal = unpaidRows.reduce((sum, row) => sum + row.fine.amount, 0);
    const interestTotal = unpaidInterestCharges.reduce((sum, row) => sum + row.charge.amount, 0);
    return finesTotal + interestTotal;
  }, [unpaidRows, unpaidInterestCharges]);

  const paidTotal = useMemo(
    () => paidRows.reduce((sum, row) => sum + row.fine.amount, 0),
    [paidRows],
  );

  const totalFinesCount = fineRows.length;

  const canPay = unpaidTotal > 0 && (unpaidRows.length > 0 || interestCharges.length > 0);
  const hasMultipleFines = unpaidRows.length + unpaidInterestCharges.length > 1;
  const mobilePayConfigured = !!mobilePayBoxUrl;

  function handlePaySingleClick(row: FineWithPayment): void {
    if (isViewerMode || row.effectiveStatus !== "unpaid" || !mobilePayConfigured) {
      return;
    }

    setPendingPaymentData({
      fineIds: [row.fine.id],
      interestChargeIds: [],
      amount: row.fine.amount,
      titles: [row.fine.title],
    });
    setShowPrePayDialog(true);
  }

  function handlePayAllClick(): void {
    if (isViewerMode || !canPay || !mobilePayConfigured) {
      return;
    }

    const fineIds = unpaidRows.map((r) => r.fine.id);
    const interestChargeIds = unpaidInterestCharges.map((r) => r.charge.id);
    const titles = [
      ...unpaidRows.map((r) => r.fine.title),
      ...unpaidInterestCharges.map(() => "Rentegebyr (5 kr)"),
    ];

    setPendingPaymentData({
      fineIds,
      interestChargeIds,
      amount: unpaidTotal,
      titles,
    });
    setShowPrePayDialog(true);
  }

  function handleCancelPrePay(): void {
    setShowPrePayDialog(false);
    setPendingPaymentData(null);
  }

  async function handleOpenMobilePay(): Promise<void> {
    setShowPrePayDialog(false);

    if (!mobilePayBoxUrl) {
      setError("MobilePay Box URL mangler.");
      return;
    }

    if (!pendingPaymentData) {
      setError("Betalingsdata mangler.");
      return;
    }

    // Prevent duplicate submissions
    if (paymentInProgress) {
      return;
    }
    setPaymentInProgress(true);
    setError(null);

    try {
      // F032: Create the Payment record (status: "pending") immediately
      // before opening MobilePay, so it exists as proof of intent.
      await createCombinedPayment(
        teamId,
        pendingPaymentData.fineIds,
        userId,
        pendingPaymentData.amount,
        userId,
        pendingPaymentData.interestChargeIds,
      );

      // Reload fines to show the newly created pending payment
      await loadData();

      // Open MobilePay Box in a new tab without navigating away
      window.open(mobilePayBoxUrl, "_blank", "noopener,noreferrer");

      // Clear the pre-payment dialog data
      setPendingPaymentData(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukendt fejl";
      setError(`Kunne ikke oprette betaling (${message}).`);
    } finally {
      setTimeout(() => setPaymentInProgress(false), 2000);
    }
  }



  return (
    <div className="personal-overview">
      <h1 className="app-title">{isViewerMode ? viewerName : "Min profil"}</h1>
      <p className="app-subtitle mb-4">{isViewerMode ? "Udestående bøder" : "Aktiv sæson"}</p>

      <div className="personal-stats">
        <div className="personal-stat-card personal-stat-card--total">
          <span className="personal-stat-card__emoji">📋</span>
          <span className="personal-stat-card__label">Bøder i alt</span>
          <span className="personal-stat-card__value">
            {loading ? "…" : totalFinesCount}
          </span>
        </div>
        <div className="personal-stat-card personal-stat-card--outstanding">
          <span className="personal-stat-card__emoji">⏳</span>
          <span className="personal-stat-card__label">Skylder</span>
          <span className="personal-stat-card__value">
            {loading ? "…" : formatAmount(unpaidTotal)}
          </span>
        </div>
        <div className="personal-stat-card personal-stat-card--paid">
          <span className="personal-stat-card__emoji">✅</span>
          <span className="personal-stat-card__label">Betalt</span>
          <span className="personal-stat-card__value">
            {loading ? "…" : formatAmount(paidTotal)}
          </span>
        </div>
      </div>

      {!isViewerMode && hasMultipleFines && (
        <button
          type="button"
          className="btn-primary personal-pay-btn"
          onClick={handlePayAllClick}
          disabled={!canPay || loading || !mobilePayConfigured || paymentInProgress}
        >
          {paymentInProgress ? "Registrerer..." : "Betal alle"}
        </button>
      )}

      {!isViewerMode && !loading && unpaidTotal > 0 && !mobilePayConfigured && (
        <p className="status-note mb-4">
          MobilePay er ikke konfigureret for dette hold.
        </p>
      )}

      {error && <p className="status-error mb-4">{error}</p>}

      {loading && <p className="status-note">Henter dine bøder...</p>}

      {!loading && fineRows.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__emoji">✅</span>
          <p className="empty-state__text">
            {isViewerMode
              ? `${viewerName} har ingen bøder i aktiv sæson.`
              : "Du har ingen bøder i aktiv sæson."}
          </p>
        </div>
      )}

      {!loading && fineRows.length > 0 && unpaidRows.length === 0 && unclaimedPendingRows.length === 0 && claimedRows.length === 0 && (
        <div className="empty-state mb-4">
          <span className="empty-state__emoji">🎉</span>
          <p className="empty-state__text">Alt er betalt. Stærkt!</p>
        </div>
      )}

      {!loading && unpaidRows.length > 0 && (
        <section className="personal-section" aria-label="Ubetalte bøder">
          <h2 className="personal-section__title">Ubetalte bøder</h2>
          <div className="item-list">
            {unpaidRows.map((row) => (
              <FineRowCard
                key={row.fine.id}
                row={row}
                actionLabel={paymentInProgress ? "Registrerer..." : "Betal bøde"}
                actionDisabled={
                  isViewerMode ||
                  !mobilePayConfigured ||
                  paymentInProgress
                }
                onAction={
                  isViewerMode || !mobilePayConfigured
                    ? undefined
                    : () => handlePaySingleClick(row)
                }
              />
            ))}
          </div>
        </section>
      )}

      {!loading && unpaidInterestCharges.length > 0 && (
        <section className="personal-section" aria-label="Rentegebyr">
          <h2 className="personal-section__title">Rentegebyr</h2>
          <div className="item-list">
            {unpaidInterestCharges.map((row) => (
              <InterestChargeRowCard
                key={row.charge.id}
                charge={row.charge}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && unclaimedPendingRows.length > 0 && (
        <section className="personal-section" aria-label="Venter på din bekræftelse">
          <h2 className="personal-section__title">Venter på din bekræftelse</h2>
          <p className="section-subtitle">Du har åbnet MobilePay. Bekræft når du har betalt:</p>
          <div className="item-list">
            {unclaimedPendingRows.map((row) => (
              <div key={row.fine.id} className="fine-with-claim-button">
                <FineRowCard row={row} />
                {row.payment && (
                  <ClaimPaymentButton
                    teamId={teamId}
                    payment={row.payment}
                    userId={userId}
                    onClaimed={() => void loadData()}
                  />
                )}
              </div>
            ))}
            {unclaimedPendingInterestCharges.map((row) => (
              <InterestChargeRowCard key={row.charge.id} charge={row.charge} />
            ))}
          </div>
        </section>
      )}

      {!loading && claimedRows.length > 0 && (
        <section className="personal-section" aria-label="Afventer godkendelse">
          <h2 className="personal-section__title">Afventer godkendelse</h2>
          <p className="section-subtitle">En admin godkender snart…</p>
          <div className="item-list">
            {claimedRows.map((row) => (
              <FineRowCard
                key={row.fine.id}
                row={row}
                badge="⏳ Afventer godkendelse"
              />
            ))}
            {claimedInterestCharges.map((row) => (
              <InterestChargeRowCard key={row.charge.id} charge={row.charge} />
            ))}
          </div>
        </section>
      )}

      {!loading && paidRows.length > 0 && (
        <section aria-label="Betalte bøder">
          <button
            type="button"
            className="personal-paid-toggle"
            onClick={() => setPaidOpen((open) => !open)}
          >
            <span className="personal-paid-toggle__text">
              {paidOpen ? "Skjul" : "Vis"} betalte bøder ({paidRows.length})
            </span>
            <span className={`personal-paid-toggle__arrow ${paidOpen ? "personal-paid-toggle__arrow--open" : ""}`}>
              ▼
            </span>
          </button>

          {paidOpen && (
            <div className="personal-paid-list">
              {paidRows.map((row) => (
                <FineRowCard key={row.fine.id} row={row} badge="✅ Betalt" />
              ))}
              {approvedInterestCharges.map((row) => (
                <InterestChargeRowCard key={row.charge.id} charge={row.charge} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pre-payment confirmation dialog */}
      {showPrePayDialog && pendingPaymentData && (
        <div className="dialog-overlay" onClick={handleCancelPrePay}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">Du er ved at betale:</h3>
            <ul className="dialog-fine-list">
              {pendingPaymentData.titles.map((title, idx) => (
                <li key={idx}>{title}</li>
              ))}
            </ul>
            <p className="dialog-total">
              <strong>I alt: {formatAmount(pendingPaymentData.amount)}</strong>
            </p>
            <p className="dialog-text">
              til klubbens MobilePay Box. Indtast beløbet manuelt i MobilePay.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleOpenMobilePay}
              >
                Åbn MobilePay
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelPrePay}
              >
                Annuller
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

interface FineRowCardProps {
  row: FineWithPayment;
  badge?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}

function FineRowCard({
  row,
  badge,
  actionLabel,
  actionDisabled,
  onAction,
}: FineRowCardProps) {
  return (
    <article className="personal-fine-card">
      <div className="personal-fine-card__header">
        <div className="personal-fine-card__info">
          <p className="personal-fine-card__title">{row.fine.title}</p>
          <p className="personal-fine-card__meta">
            {formatRelativeTime(row.fine.createdAt)} · Tildelt af {row.assignedByName}
          </p>
        </div>

        <p className="personal-fine-card__amount">
          {formatAmount(row.fine.amount)}
        </p>
      </div>

      {row.fine.note && (
        <p className="personal-fine-card__note">Notat: {row.fine.note}</p>
      )}

      {badge && <p className="personal-fine-card__badge">{badge}</p>}

      {onAction && (
        <button
          type="button"
          className="btn-primary personal-fine-card__action w-full"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}

interface InterestChargeRowCardProps {
  charge: InterestCharge;
}

function InterestChargeRowCard({ charge }: InterestChargeRowCardProps) {
  return (
    <article className="personal-fine-card">
      <div className="personal-fine-card__header">
        <div className="personal-fine-card__info">
          <p className="personal-fine-card__title">Rentegebyr</p>
          <p className="personal-fine-card__meta">
            Opkrævet {formatRelativeTime(charge.createdAt)}
          </p>
        </div>

        <p className="personal-fine-card__amount">
          {formatAmount(charge.amount)}
        </p>
      </div>

      <p className="personal-fine-card__note">
        Daglig rente på {charge.amount} kr. for ubetalt bøde fra {charge.month}
      </p>
    </article>
  );
}
