import { useCallback, useEffect, useMemo, useState } from "react";
import type { Fine, Payment, PaymentStatus, User } from "../../types/domain";
import {
  getActiveSeason,
  getFinesForUser,
  getPaymentsForUser,
  getTeam,
  getUsers,
  createCombinedPayment,
} from "../../lib/firestore";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
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

export default function PersonalOverview({ teamId, userId, viewerName }: PersonalOverviewProps) {
  const isViewerMode = !!viewerName;
  const [loading, setLoading] = useState(true);
  const [payingFineId, setPayingFineId] = useState<string | null>(null);
  const [isPayingAll, setIsPayingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobilePayBoxUrl, setMobilePayBoxUrl] = useState<string | null>(null);
  const [paidOpen, setPaidOpen] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  // Dialog state for MobilePay Box flow
  const [showPrePayDialog, setShowPrePayDialog] = useState(false);
  const [showPostPayDialog, setShowPostPayDialog] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    fineIds: string[];
    amount: number;
    titles: string[];
  } | null>(null);

  const [fineRows, setFineRows] = useState<FineWithPayment[]>([]);

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
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [season, fines, payments, team, users] = await Promise.all([
        getActiveSeason(teamId),
        getFinesForUser(teamId, userId),
        getPaymentsForUser(teamId, userId),
        getTeam(teamId),
        getUsers(),
      ]);

      const activeSeasonFines = season
        ? fines.filter((fine) => fine.seasonId === season.id)
        : [];

      // Build a map of fineId -> pending Payment (if any)
      const pendingPaymentByFineId = new Map<string, Payment>();
      for (const payment of payments) {
        if (payment.status === "pending") {
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
          if (pendingPayment) {
            effectiveStatus = "pending";
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

      setFineRows(rows);
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
  const pendingRows = useMemo(
    () => fineRows.filter((row) => row.effectiveStatus === "pending"),
    [fineRows],
  );
  const paidRows = useMemo(
    () => fineRows.filter((row) => row.effectiveStatus === "approved"),
    [fineRows],
  );

  const unpaidTotal = useMemo(
    () => unpaidRows.reduce((sum, row) => sum + row.fine.amount, 0),
    [unpaidRows],
  );

  const paidTotal = useMemo(
    () => paidRows.reduce((sum, row) => sum + row.fine.amount, 0),
    [paidRows],
  );

  const totalFinesCount = fineRows.length;

  const canPay = unpaidTotal > 0 && unpaidRows.length > 0;
  const hasMultipleFines = unpaidRows.length > 1;
  const mobilePayConfigured = !!mobilePayBoxUrl;

  function handlePaySingleClick(row: FineWithPayment): void {
    if (isViewerMode || row.effectiveStatus !== "unpaid" || !mobilePayConfigured) {
      return;
    }

    setPendingPaymentData({
      fineIds: [row.fine.id],
      amount: row.fine.amount,
      titles: [row.fine.title],
    });
    setShowPrePayDialog(true);
  }

  function handlePayAllClick(): void {
    if (isViewerMode || !canPay || !mobilePayConfigured) {
      return;
    }

    setPendingPaymentData({
      fineIds: unpaidRows.map((r) => r.fine.id),
      amount: unpaidTotal,
      titles: unpaidRows.map((r) => r.fine.title),
    });
    setShowPrePayDialog(true);
  }

  function handleCancelPrePay(): void {
    setShowPrePayDialog(false);
    setPendingPaymentData(null);
  }

  function handleOpenMobilePay(): void {
    setShowPrePayDialog(false);

    if (!mobilePayBoxUrl) {
      setError("MobilePay Box URL mangler.");
      return;
    }

    // Open MobilePay Box in a new tab without navigating away
    window.open(mobilePayBoxUrl, "_blank", "noopener,noreferrer");

    // Show post-payment confirmation dialog
    setShowPostPayDialog(true);
  }

  async function handleConfirmPayment(): Promise<void> {
    setShowPostPayDialog(false);

    if (!pendingPaymentData) {
      setError("Betalingsdata mangler.");
      return;
    }

    // Prevent duplicate submissions with 2-second debounce
    if (paymentInProgress) {
      return;
    }
    setPaymentInProgress(true);

    const isSingle = pendingPaymentData.fineIds.length === 1;
    if (isSingle) {
      setPayingFineId(pendingPaymentData.fineIds[0]);
    } else {
      setIsPayingAll(true);
    }
    setError(null);

    try {
      await createCombinedPayment(
        teamId,
        pendingPaymentData.fineIds,
        userId,
        pendingPaymentData.amount,
        userId,
      );
      await loadData();
    } catch (payError) {
      const message = payError instanceof Error ? payError.message : "Ukendt fejl";
      setError(`Kunne ikke registrere betaling (${message}).`);
    } finally {
      setPayingFineId(null);
      setIsPayingAll(false);
      setPendingPaymentData(null);
      // Re-enable payment button after 2 seconds
      setTimeout(() => setPaymentInProgress(false), 2000);
    }
  }

  function handleCancelPayment(): void {
    setShowPostPayDialog(false);
    setPendingPaymentData(null);
    setPayingFineId(null);
    setIsPayingAll(false);
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
          disabled={!canPay || isPayingAll || loading || !mobilePayConfigured || paymentInProgress}
        >
          {isPayingAll ? "Registrerer..." : "Betal alle"}
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

      {!loading && fineRows.length > 0 && unpaidRows.length === 0 && pendingRows.length === 0 && (
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
                actionLabel={payingFineId === row.fine.id ? "Registrerer..." : "Betal bøde"}
                actionDisabled={
                  isViewerMode ||
                  payingFineId === row.fine.id ||
                  isPayingAll ||
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

      {!loading && pendingRows.length > 0 && (
        <section className="personal-section" aria-label="Afventer godkendelse">
          <h2 className="personal-section__title">Afventer godkendelse</h2>
          <div className="item-list">
            {pendingRows.map((row) => (
              <FineRowCard
                key={row.fine.id}
                row={row}
                badge="⏳ Afventer godkendelse"
              />
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

      {/* Post-payment confirmation dialog */}
      {showPostPayDialog && (
        <div className="dialog-overlay" onClick={handleCancelPayment}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">Har du gennemført betalingen?</h3>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  void handleConfirmPayment();
                }}
              >
                Ja
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelPayment}
              >
                Nej
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
