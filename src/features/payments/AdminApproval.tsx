import { useEffect, useState } from "react";
import type { Payment, Role } from "../../types/domain";
import { getPendingPayments, approvePayment, disputePayment } from "../../lib/firestore/payments";
import { getUserProfile } from "../../lib/firestore/users";
import { getFine } from "../../lib/firestore/fines";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import { canApprovePayments } from "../../lib/permissions";
import "./admin-approval.css";

interface Props {
  teamId: string;
  actorId: string;
  userRole?: Role | null;
  isSuperAdmin?: boolean;
}

export default function AdminApproval({ teamId, actorId, userRole, isSuperAdmin }: Props) {
  const [items, setItems] = useState<Array<{ payment: Payment; userName?: string; fineTitle?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    void load();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const payments = await getPendingPayments(teamId);
        const detailed = await Promise.all(
          payments.map(async (p) => {
            const user = await getUserProfile(p.userId);
            const fine = await getFine(teamId, p.fineId);
            return { payment: p, userName: user?.name, fineTitle: fine?.title };
          }),
        );
        setItems(detailed);
      } catch (err) {
        console.error("[admin-approval] load failed", err);
        setError("Hentning af betalinger mislykkedes.");
      } finally {
        setLoading(false);
      }
    }
  }, [teamId]);

  if (!teamId) {
    return (
      <div className="app-page">
        <h1 className="app-title">Godkend betalinger</h1>
        <div className="empty-state">
          <p>Vælg et hold for at se betalinger.</p>
        </div>
      </div>
    );
  }

  if (!canApprovePayments(userRole ?? null, isSuperAdmin)) {
    return (
      <div className="app-page">
        <h1 className="app-title">Godkend betalinger</h1>
        <div className="empty-state">
          <p>Du har ikke adgang til at godkende betalinger.</p>
        </div>
      </div>
    );
  }

  async function handleApprove(paymentId: string) {
    setProcessingId(paymentId);
    setError(null);
    try {
      await approvePayment(teamId, paymentId, actorId);
      setItems((s) => s.filter((it) => it.payment.id !== paymentId));
    } catch (err) {
      console.error("[admin-approval] approve failed", err);
      setError("Godkendelse mislykkedes. Prøv igen.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDispute(paymentId: string) {
    setProcessingId(paymentId);
    setError(null);
    try {
      await disputePayment(teamId, paymentId, actorId);
      setItems((s) => s.filter((it) => it.payment.id !== paymentId));
    } catch (err) {
      console.error("[admin-approval] dispute failed", err);
      setError("Underkendelse mislykkedes. Prøv igen.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="app-page">
      <h1 className="app-title">Godkend betalinger</h1>

      <p className="app-subtitle mb-4" role="status" aria-live="polite">
        Ventende betalinger: {items.length}
      </p>

      {loading && (
        <p className="status-note" role="status" aria-live="polite">
          Indlæser betalinger…
        </p>
      )}
      {error && (
        <div className="app-card app-card--muted p-3 mb-3 text-xs text-red-600" role="alert">
          {error}
        </div>
      )}

      {items.length === 0 && !loading && (
        <div className="empty-state">
          <p>Der er ingen betalinger, der venter på godkendelse.</p>
        </div>
      )}

      <ul className="admin-approval-list" aria-label="Ventende betalinger">
        {items.map((it) => (
          <li key={it.payment.id} className="app-card admin-approval-item">
            <div className="admin-approval-main">
              <div className="admin-approval-title">
                <strong>{it.userName ?? it.payment.userId}</strong>
                <span className="admin-approval-fine">{it.fineTitle ?? "Bøde"}</span>
              </div>
              <div className="admin-approval-meta">
                <span className="admin-approval-amount">{formatAmount(it.payment.amount)}</span>
                {it.payment.initiatedAt && (
                  <span className="admin-approval-time">{formatRelativeTime(it.payment.initiatedAt)}</span>
                )}
              </div>
            </div>
            <div className="admin-approval-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleApprove(it.payment.id)}
                disabled={processingId === it.payment.id}
              >
                {processingId === it.payment.id ? "Behandler…" : "Godkend"}
              </button>
              <button
                type="button"
                className="btn-secondary ml-2"
                onClick={() => void handleDispute(it.payment.id)}
                disabled={processingId === it.payment.id}
              >
                Underkend
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
