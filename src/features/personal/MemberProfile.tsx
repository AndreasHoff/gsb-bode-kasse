import { useEffect, useState, useCallback } from "react";
import {
  getUserSeasonBalance,
  getActiveSeason,
  getFinesForUser,
  getPaymentsForUser,
  removeMemberFromFine,
} from "../../lib/firestore";
import { canDeleteFines } from "../../lib/permissions";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import type { UserSeasonBalance, Fine, Payment, Role } from "../../types/domain";
import "../profile/profile.css";

interface MemberProfileProps {
  userId: string;
  userName: string;
  teamId: string;
  actorId: string;
  actorRole: Role | null;
  onBack: () => void;
}

type FineWithPayment = Fine & {
  paymentStatus: "unpaid" | "pending" | "approved" | "disputed";
};

interface DeleteConfirmation {
  fineId: string;
  fineTitle: string;
  fineAmount: number;
}

export default function MemberProfile({
  userId,
  userName,
  teamId,
  actorId,
  actorRole,
  onBack,
}: MemberProfileProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<UserSeasonBalance | null>(null);
  const [fines, setFines] = useState<FineWithPayment[]>([]);
  const [seasonName, setSeasonName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const season = await getActiveSeason(teamId);
      if (!season) {
        setSeasonName("");
        setBalance(null);
        setFines([]);
        setIsLoading(false);
        return;
      }

      setSeasonName(season.name);

      // Fetch balance
      const userBalance = await getUserSeasonBalance(userId, teamId, season.id);
      setBalance(userBalance);

      // Fetch fines and payments
      const [allFines, allPayments] = await Promise.all([
        getFinesForUser(teamId, userId),
        getPaymentsForUser(teamId, userId),
      ]);

      // Filter to current season and non-deleted
      const seasonFines = allFines.filter(
        (f) => f.seasonId === season.id && !f.deletedAt,
      );

      // Build payment lookup
      const paymentByFineId = new Map<string, Payment>();
      for (const payment of allPayments) {
        if (payment.fineIds) {
          for (const fid of payment.fineIds) {
            paymentByFineId.set(fid, payment);
          }
        }
        if (payment.fineId) {
          paymentByFineId.set(payment.fineId, payment);
        }
      }

      // Add payment status to fines
      const finesWithPayment: FineWithPayment[] = seasonFines.map((fine) => {
        const payment = paymentByFineId.get(fine.id);
        return {
          ...fine,
          paymentStatus: payment?.status || "unpaid",
        };
      });

      // Sort by creation date (newest first)
      finesWithPayment.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setFines(finesWithPayment);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      setErrorMessage(`Kunne ikke hente medlemsprofil (${message}).`);
    } finally {
      setIsLoading(false);
    }
  }, [userId, teamId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleDeleteConfirmed(): Promise<void> {
    if (!deleteConfirm || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await removeMemberFromFine(teamId, deleteConfirm.fineId, userId, actorId);
      setFines((prev) => prev.filter((f) => f.id !== deleteConfirm.fineId));
      setDeleteConfirm(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      setErrorMessage(`Kunne ikke slette bøde (${message}).`);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDeleteClick(fineId: string, fineTitle: string, fineAmount: number): void {
    setDeleteConfirm({ fineId, fineTitle, fineAmount });
  }

  const outstanding = balance?.outstandingBalance ?? 0;
  const pending = balance?.pendingBalance ?? 0;
  const approved = balance?.approvedBalance ?? 0;

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-page">
      {/* Back button */}
      <button
        onClick={onBack}
        className="back-button"
        aria-label="Tilbage til holdoversigt"
      >
        ← Tilbage
      </button>

      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <h1 className="app-title">{userName}</h1>
        <p className="app-subtitle">{seasonName || "Medlemsprofil"}</p>
      </div>

      {isLoading && <p className="status-note">Henter data...</p>}

      {errorMessage && <p className="status-error">{errorMessage}</p>}

      {!isLoading && !errorMessage && !seasonName && (
        <div className="empty-state py-8">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm font-medium">Ingen aktiv sæson</p>
        </div>
      )}

      {!isLoading && !errorMessage && seasonName && (
        <>
          {/* Balance Overview */}
          <section className="profile-section">
            <h2 className="profile-section-title">Saldo</h2>
            <div className="balance-grid">
              <div className="balance-card balance-card--outstanding">
                <div className="balance-card__label">Ubetalt</div>
                <div className="balance-card__value">{formatAmount(outstanding)}</div>
              </div>
              <div className="balance-card balance-card--pending">
                <div className="balance-card__label">Afventer</div>
                <div className="balance-card__value">{formatAmount(pending)}</div>
              </div>
              <div className="balance-card balance-card--approved">
                <div className="balance-card__label">Godkendt</div>
                <div className="balance-card__value">{formatAmount(approved)}</div>
              </div>
            </div>
          </section>

          {/* Fines List */}
          <section className="profile-section">
            <h2 className="profile-section-title">Bøder</h2>
            {fines.length === 0 && (
              <div className="empty-state py-6">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-sm">Ingen bøder i denne sæson.</p>
              </div>
            )}
            {fines.length > 0 && (
              <div className="fine-list">
                {fines.map((fine) => (
                  <div key={fine.id} className="fine-item">
                    <div className="fine-item__header">
                      <span className="fine-item__title">{fine.title}</span>
                      <span className="fine-item__amount">
                        {formatAmount(fine.amount)}
                      </span>
                    </div>
                    <div className="fine-item__meta">
                      <span className="fine-item__date">
                        {formatRelativeTime(fine.createdAt)}
                      </span>
                      <span
                        className={`fine-item__status fine-item__status--${fine.paymentStatus}`}
                      >
                        {fine.paymentStatus === "unpaid" && "Ubetalt"}
                        {fine.paymentStatus === "pending" && "Afventer"}
                        {fine.paymentStatus === "approved" && "Godkendt"}
                        {fine.paymentStatus === "disputed" && "Afvist"}
                      </span>
                    </div>
                    {fine.note && (
                      <div className="fine-item__note">{fine.note}</div>
                    )}
                    {canDeleteFines(actorRole) && (
                      <div className="fine-item__actions mt-2">
                        <button
                          type="button"
                          className="btn-danger btn-sm w-full"
                          disabled={isDeleting}
                          onClick={() =>
                            handleDeleteClick(fine.id, fine.title, fine.amount)
                          }
                        >
                          {isDeleting ? "Sletter…" : "Slet bøde"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {deleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-dialog">
                  <div className="modal-header">
                    <h3 className="modal-title">Slet bøde?</h3>
                  </div>
                  <div className="modal-body">
                    <p>
                      Vil du slette bøden <strong>{deleteConfirm.fineTitle}</strong> ({formatAmount(deleteConfirm.fineAmount)}) fra {userName}?
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      ⚠️ Denne handling kan ikke fortrydes. Betalinger bliver stående for revision.
                    </p>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn-danger flex-1"
                      disabled={isDeleting}
                      onClick={() => void handleDeleteConfirmed()}
                    >
                      {isDeleting ? "Sletter…" : "Slet"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      disabled={isDeleting}
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Nej
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
