import { useEffect, useState } from "react";
import type { Payment, Role } from "../../types/domain";
import {
  getClaimedPayments,
  approveClaimedPayment,
  denyPayment,
} from "../../lib/firestore/payments";
import {
  createApprovedNotification,
  createDeniedNotification,
} from "../../lib/firestore/notifications";
import { getUserProfile } from "../../lib/firestore/users";
import { getFine } from "../../lib/firestore/fines";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import { canApprovePayments } from "../../lib/permissions";
import "./admin-approval.css";

interface Props {
  teamId: string;
  actorId: string;
  userRole?: Role | null;
}

type PaymentWithDetails = {
  payment: Payment;
  userName?: string;
  fineTitles: string[];
};

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

export default function AdminApproval({ teamId, actorId, userRole }: Props) {
  const [items, setItems] = useState<PaymentWithDetails[]>([]);
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
        const payments = await getClaimedPayments(teamId);
        // Sort by most recent first
        const sorted = payments.sort(
          (a, b) =>
            new Date(b.initiatedAt || b.id).getTime() -
            new Date(a.initiatedAt || a.id).getTime(),
        );

        const detailed = await Promise.all(
          sorted.map(async (p) => {
            const user = await getUserProfile(p.userId);
            const fineIds = getFineIdsFromPayment(p);
            const fines = await Promise.all(
              fineIds.map((fid) => getFine(teamId, fid)),
            );
            const fineTitles = fines
              .filter((f) => f !== null)
              .map((f) => f!.title);
            return { payment: p, userName: user?.name, fineTitles };
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
      <div className="admin-approval">
        <h1 className="app-title">Betalinger</h1>
        <div className="empty-state mt-4">
          <span className="empty-state__emoji">🏢</span>
          <p className="empty-state__text">Vælg et hold for at se betalinger.</p>
        </div>
      </div>
    );
  }

  if (!canApprovePayments(userRole ?? null)) {
    return (
      <div className="admin-approval">
        <h1 className="app-title">Betalinger</h1>
        <div className="empty-state mt-4">
          <span className="empty-state__emoji">🔒</span>
          <p className="empty-state__text">Du har ikke adgang til at behandle betalinger.</p>
        </div>
      </div>
    );
  }

  async function handleApprove(payment: Payment) {
    setProcessingId(payment.id);
    setError(null);
    try {
      await approveClaimedPayment(teamId, payment.id, actorId);
      // Send notification to member
      await createApprovedNotification(teamId, payment.userId, payment.id);
      setItems((s) => s.filter((it) => it.payment.id !== payment.id));
    } catch (err) {
      console.error("[admin-approval] approve failed", err);
      setError("Godkendelse mislykkedes. Prøv igen.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeny(payment: Payment) {
    setProcessingId(payment.id);
    setError(null);
    try {
      await denyPayment(teamId, payment.id, actorId);
      // Send notification to member
      await createDeniedNotification(teamId, payment.userId, payment.id);
      setItems((s) => s.filter((it) => it.payment.id !== payment.id));
    } catch (err) {
      console.error("[admin-approval] deny failed", err);
      setError("Afvisning mislykkedes. Prøv igen.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="admin-approval">
      <h1 className="app-title">Betalinger</h1>
      <p className="app-subtitle">Gennemgå og godkend betalingskrav</p>

      <div className="admin-approval-count">
        <span className="admin-approval-count__label">Afventer godkendelse:</span>
        <span className="admin-approval-count__value">{items.length}</span>
      </div>

      {loading && <p className="status-note">Indlæser betalinger…</p>}

      {error && <p className="status-error mb-3">{error}</p>}

      {items.length === 0 && !loading && (
        <div className="empty-state">
          <span className="empty-state__emoji">✅</span>
          <p className="empty-state__text">Ingen betalinger afventer godkendelse</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="admin-approval-list" aria-label="Betalingskrav der afventer godkendelse">
          {items.map((it) => (
            <li key={it.payment.id} className="app-card admin-approval-item">
              <div className="admin-approval-main">
                <div className="admin-approval-info">
                  <p className="admin-approval-name">
                    {it.userName ?? it.payment.userId}
                  </p>
                  {it.fineTitles.length === 1 && (
                    <p className="admin-approval-fine">{it.fineTitles[0]}</p>
                  )}
                  {it.fineTitles.length > 1 && (
                    <p className="admin-approval-fine">
                      {it.fineTitles.length} bøder samlet
                    </p>
                  )}
                  {it.fineTitles.length === 0 && (
                    <p className="admin-approval-fine">Bøde</p>
                  )}
                </div>
                <div className="admin-approval-meta">
                  <span className="admin-approval-amount">
                    {formatAmount(it.payment.amount)}
                  </span>
                  {it.payment.initiatedAt && (
                    <span className="admin-approval-time">
                      {formatRelativeTime(it.payment.initiatedAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="admin-approval-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleApprove(it.payment)}
                  disabled={processingId === it.payment.id}
                >
                  {processingId === it.payment.id ? "Behandler…" : "Godkend"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void handleDeny(it.payment)}
                  disabled={processingId === it.payment.id}
                >
                  Afvis
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
