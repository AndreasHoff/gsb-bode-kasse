import { useCallback, useEffect, useMemo, useState } from "react";
import type { Fine, Payment, PaymentStatus, User } from "../../types/domain";
import {
  getActiveSeason,
  getFinesForUser,
  getPaymentsForUser,
  getTeam,
  getUsers,
  initiatePayment,
} from "../../lib/firestore";
import { buildMobilePayDeepLink, formatAmount, formatRelativeTime } from "../../lib/utils";

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
  const [mobilePayRecipient, setMobilePayRecipient] = useState<string | null>(null);
  const [paidOpen, setPaidOpen] = useState(false);

  const [fineRows, setFineRows] = useState<FineWithPayment[]>([]);

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

      const paymentByFineId = new Map<string, Payment>();
      for (const payment of payments) {
        paymentByFineId.set(payment.fineId, payment);
      }

      const userById = new Map<string, User>();
      for (const user of users) {
        userById.set(user.id, user);
      }

      const rows: FineWithPayment[] = activeSeasonFines
        .map((fine) => {
          const payment = paymentByFineId.get(fine.id) ?? null;
          const assignedByName = userById.get(fine.assignedBy)?.name ?? "Ukendt";
          const effectiveStatus = payment?.status ?? "unpaid";

          return {
            fine,
            payment,
            assignedByName,
            effectiveStatus,
          };
        })
        .sort((a, b) => b.fine.createdAt.localeCompare(a.fine.createdAt));

      setFineRows(rows);
      setMobilePayRecipient(isViewerMode ? null : (team?.mobilePayRecipient?.trim() || null));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Ukendt fejl";
      setError(`Kunne ikke hente dine bøder (${message}).`);
    } finally {
      setLoading(false);
    }
  }, [teamId, userId, viewerName]);

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

  const canPay = unpaidTotal > 0 && !!mobilePayRecipient;

  async function startMobilePay(amount: number, comment: string): Promise<void> {
    const recipient = mobilePayRecipient?.trim();
    if (!recipient) {
      return;
    }

    const { nativeUrl, webUrl } = buildMobilePayDeepLink({
      amount,
      recipient,
      comment,
    });

    let appOpened = false;
    const markAppOpened = (): void => {
      if (document.visibilityState === "hidden") appOpened = true;
    };
    const markAppOpenedOnPageHide = (): void => {
      appOpened = true;
    };

    document.addEventListener("visibilitychange", markAppOpened);
    window.addEventListener("pagehide", markAppOpenedOnPageHide);

    window.location.assign(nativeUrl);

    setTimeout(() => {
      document.removeEventListener("visibilitychange", markAppOpened);
      window.removeEventListener("pagehide", markAppOpenedOnPageHide);

      if (!appOpened) {
        window.location.assign(webUrl);
      }
    }, 1200);
  }

  async function handlePaySingle(row: FineWithPayment): Promise<void> {
    if (isViewerMode || !row.payment || row.effectiveStatus !== "unpaid") {
      return;
    }

    setPayingFineId(row.fine.id);
    setError(null);

    try {
      await initiatePayment(teamId, row.payment.id, userId);
      await startMobilePay(row.fine.amount, `Bøde: ${row.fine.title}`);
      await loadData();
    } catch (payError) {
      const message = payError instanceof Error ? payError.message : "Ukendt fejl";
      setError(`Kunne ikke starte betaling (${message}).`);
    } finally {
      setPayingFineId(null);
    }
  }

  async function handlePayAll(): Promise<void> {
    if (isViewerMode || !canPay) {
      return;
    }

    const paymentsToInitiate = unpaidRows
      .map((row) => row.payment)
      .filter((payment): payment is Payment => payment !== null);

    if (paymentsToInitiate.length === 0) {
      setError("Mangler betalingslinjer for en eller flere bøder.");
      return;
    }

    setIsPayingAll(true);
    setError(null);

    try {
      await Promise.all(
        paymentsToInitiate.map((payment) => initiatePayment(teamId, payment.id, userId)),
      );
      await startMobilePay(unpaidTotal, "Bøder GSB");
      await loadData();
    } catch (payError) {
      const message = payError instanceof Error ? payError.message : "Ukendt fejl";
      setError(`Kunne ikke starte samlet betaling (${message}).`);
    } finally {
      setIsPayingAll(false);
    }
  }

  return (
    <div className="app-page pb-8">
      <h1 className="app-title">{isViewerMode ? viewerName : "Mine bøder"}</h1>
      <p className="app-subtitle mb-6">{isViewerMode ? "Udestående bøder" : "Aktiv sæson"}</p>

      <div className="app-card app-card--muted mb-4 p-5 text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">Udestående</p>
        <p className="mt-1 text-4xl font-bold text-[var(--color-primary)]">
          {loading ? "..." : formatAmount(unpaidTotal)}
        </p>
      </div>

      {!isViewerMode && (
        <button
          type="button"
          className="btn-primary w-full mb-6"
          onClick={() => {
            void handlePayAll();
          }}
          disabled={!canPay || isPayingAll || loading}
        >
          {isPayingAll ? "Starter betaling..." : "Betal alle"}
        </button>
      )}

      {!isViewerMode && !loading && unpaidTotal > 0 && !mobilePayRecipient && (
        <p className="status-note mb-4">
          Holdets MobilePay-modtager mangler. Kontakt en admin.
        </p>
      )}

      {error && <p className="status-error mb-4">{error}</p>}

      {loading && <p className="status-note">Henter dine bøder...</p>}

      {!loading && fineRows.length === 0 && (
        <div className="empty-state py-8">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-sm">
            {isViewerMode
              ? `${viewerName} har ingen bøder i aktiv sæson.`
              : "Du har ingen bøder i aktiv sæson."}
          </p>
        </div>
      )}

      {!loading && fineRows.length > 0 && unpaidRows.length === 0 && pendingRows.length === 0 && (
        <div className="empty-state py-6 mb-4">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-sm">Alt er betalt. Stærkt!</p>
        </div>
      )}

      {!loading && unpaidRows.length > 0 && (
        <section className="mb-6" aria-label="Ubetalte bøder">
          <h2 className="text-sm font-semibold mb-3">Ubetalte bøder</h2>
          <div className="space-y-3">
            {unpaidRows.map((row) => (
              <FineRowCard
                key={row.fine.id}
                row={row}
                actionLabel={payingFineId === row.fine.id ? "Starter..." : "Betal"}
                actionDisabled={isViewerMode || !mobilePayRecipient || payingFineId === row.fine.id || isPayingAll}
                onAction={isViewerMode ? undefined : () => {
                  void handlePaySingle(row);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && pendingRows.length > 0 && (
        <section className="mb-6" aria-label="Afventer godkendelse">
          <h2 className="text-sm font-semibold mb-3">Afventer godkendelse</h2>
          <div className="space-y-3">
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
            className="btn-secondary w-full text-sm"
            onClick={() => setPaidOpen((open) => !open)}
          >
            {paidOpen ? "Skjul" : "Vis"} betalte bøder ({paidRows.length})
          </button>

          {paidOpen && (
            <div className="space-y-3 mt-3">
              {paidRows.map((row) => (
                <FineRowCard key={row.fine.id} row={row} badge="✅ Betalt" />
              ))}
            </div>
          )}
        </section>
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
    <article className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)]">{row.fine.title}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {formatRelativeTime(row.fine.createdAt)} · Tildelt af {row.assignedByName}
          </p>
          {row.fine.note && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Notat: {row.fine.note}</p>
          )}
        </div>

        <p className="text-sm font-bold text-[var(--color-primary)] shrink-0">
          {formatAmount(row.fine.amount)}
        </p>
      </div>

      {badge && <p className="text-xs mt-2 text-[var(--color-text-muted)]">{badge}</p>}

      {onAction && (
        <button
          type="button"
          className="btn-primary mt-3 w-full"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </article>
  );
}
