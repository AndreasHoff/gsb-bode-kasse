// Feature: Payment Reconciliation & Refunds (F015)
// Admin can refund approved payments and manually reconcile unpaid/disputed ones.

import { useCallback, useEffect, useState } from "react";
import type { Payment } from "../../types/domain";
import {
  getApprovedPayments,
  getPaymentsForReconciliation,
  refundPayment,
  reconcilePayment,
  getFine,
} from "../../lib/firestore";
import { getUserProfile } from "../../lib/firestore";
import { formatAmount, formatRelativeTime } from "../../lib/utils";

interface EnrichedPayment {
  payment: Payment;
  userName?: string;
  fineTitle?: string;
}

interface Props {
  teamId: string;
  actorId: string;
}

export default function RefundReconcile({ teamId, actorId }: Props) {
  const [approved, setApproved] = useState<EnrichedPayment[]>([]);
  const [reconcilable, setReconcilable] = useState<EnrichedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null);

  async function enrich(payments: Payment[]): Promise<EnrichedPayment[]> {
    return Promise.all(
      payments.map(async (p) => {
        const [user, fine] = await Promise.all([
          getUserProfile(p.userId),
          getFine(teamId, p.fineId),
        ]);
        return { payment: p, userName: user?.name, fineTitle: fine?.title };
      }),
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [approvedRaw, reconcilableRaw] = await Promise.all([
        getApprovedPayments(teamId),
        getPaymentsForReconciliation(teamId),
      ]);
      const [enrichedApproved, enrichedReconcilable] = await Promise.all([
        enrich(approvedRaw),
        enrich(reconcilableRaw),
      ]);
      setApproved(enrichedApproved.sort((a, b) => {
        const aTime = a.payment.approvedAt ?? "";
        const bTime = b.payment.approvedAt ?? "";
        return bTime.localeCompare(aTime);
      }));
      setReconcilable(enrichedReconcilable.sort((a, b) =>
        (a.userName ?? "").localeCompare(b.userName ?? "", "da"),
      ));
    } catch {
      setError("Hentning af betalinger mislykkedes.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRefund(paymentId: string): Promise<void> {
    if (processingId) return;
    setProcessingId(paymentId);
    setError(null);
    setConfirmRefundId(null);
    try {
      await refundPayment(teamId, paymentId, actorId);
      setApproved((prev) => prev.filter((r) => r.payment.id !== paymentId));
    } catch {
      setError("Refundering mislykkedes.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReconcile(paymentId: string): Promise<void> {
    if (processingId) return;
    setProcessingId(paymentId);
    setError(null);
    try {
      await reconcilePayment(teamId, paymentId, actorId);
      setReconcilable((prev) => prev.filter((r) => r.payment.id !== paymentId));
    } catch {
      setError("Manuel godkendelse mislykkedes.");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-[var(--color-text-muted)]">Henter betalinger…</p>;
  }

  return (
    <div className="p-4 flex flex-col gap-6 pb-8">
      {error && <p className="status-error">{error}</p>}

      {/* Refund section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">
          Godkendte betalinger
        </h2>

        {approved.length === 0 ? (
          <div className="empty-state py-6">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm">Ingen godkendte betalinger.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {approved.map(({ payment, userName, fineTitle }) => {
              const isConfirming = confirmRefundId === payment.id;
              const isProcessing = processingId === payment.id;
              return (
                <li key={payment.id} className="app-card p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{userName ?? "Ukendt"}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {fineTitle ?? "Ukendt bøde"}
                      </p>
                      {payment.approvedAt && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Godkendt {formatRelativeTime(payment.approvedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-sm font-extrabold">
                        {formatAmount(payment.amount)}
                      </span>
                      {!isConfirming && (
                        <button
                          type="button"
                          className="member-management__action-btn member-management__action-btn--danger"
                          disabled={isProcessing || !!processingId}
                          onClick={() => setConfirmRefundId(payment.id)}
                        >
                          Refunder
                        </button>
                      )}
                    </div>
                  </div>
                  {isConfirming && (
                    <div className="member-management__confirm">
                      <p>Er du sikker? Betalingen markeres som ubetalt igen.</p>
                      <div className="member-management__confirm-actions">
                        <button
                          type="button"
                          className="btn-danger flex-1"
                          disabled={isProcessing}
                          onClick={() => void handleRefund(payment.id)}
                        >
                          {isProcessing ? "Refunderer…" : "Ja, refunder"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary flex-1"
                          disabled={isProcessing}
                          onClick={() => setConfirmRefundId(null)}
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
      </section>

      {/* Reconcile section */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
          Manuel betaling
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Marker en bøde som betalt uden MobilePay, f.eks. ved kontantbetaling.
        </p>

        {reconcilable.length === 0 ? (
          <div className="empty-state py-6">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">Ingen ubetalte bøder.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {reconcilable.map(({ payment, userName, fineTitle }) => {
              const isProcessing = processingId === payment.id;
              return (
                <li
                  key={payment.id}
                  className="app-card p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{userName ?? "Ukendt"}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {fineTitle ?? "Ukendt bøde"}
                    </p>
                    <span
                      className={`text-xs font-semibold ${
                        payment.status === "disputed"
                          ? "text-[var(--color-error)]"
                          : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {payment.status === "disputed" ? "Bestridt" : "Ubetalt"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-extrabold">
                      {formatAmount(payment.amount)}
                    </span>
                    <button
                      type="button"
                      className="member-management__action-btn"
                      disabled={isProcessing || !!processingId}
                      onClick={() => void handleReconcile(payment.id)}
                    >
                      {isProcessing ? "Godkender…" : "Marker som betalt"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
