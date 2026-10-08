import { useEffect, useState, useCallback } from "react";
import {
  getUserSeasonBalance,
  getActiveSeason,
  getFinesForUser,
  getPaymentsForUser,
  removeMemberFromFine,
  getInterestChargesForUser,
  softDeleteInterestCharge,
} from "../../lib/firestore";
import { canDeleteFines, canDeleteInterestCharges, canAssignFines } from "../../lib/permissions";
import { formatAmount, formatRelativeTime } from "../../lib/utils";
import type { UserSeasonBalance, Fine, Payment, Role, InterestCharge } from "../../types/domain";
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

type DeleteConfirmationType = "fine" | "interest";

interface DeleteConfirmation {
  type: DeleteConfirmationType;
  id: string;
  title: string;
  amount: number;
}

/** Formats an ISO date (YYYY-MM-DD) to dd-mm-yyyy format */
function formatChargedDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
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
  const [interestCharges, setInterestCharges] = useState<InterestCharge[]>([]);
  const [seasonName, setSeasonName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInterestsExpanded, setIsInterestsExpanded] = useState(false);

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

      // Fetch fines, payments, and interest charges
      const [allFines, allPayments, userInterestCharges] = await Promise.all([
        getFinesForUser(teamId, userId),
        getPaymentsForUser(teamId, userId),
        getInterestChargesForUser(teamId, userId),
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
      
      // Filter interest charges to current season and sort by date
      const seasonInterestCharges = userInterestCharges.filter(
        (charge) => charge.seasonId === season.id,
      );
      seasonInterestCharges.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setInterestCharges(seasonInterestCharges);
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
      if (deleteConfirm.type === "fine") {
        await removeMemberFromFine(teamId, deleteConfirm.id, userId, actorId);
        setFines((prev) => prev.filter((f) => f.id !== deleteConfirm.id));
      } else if (deleteConfirm.type === "interest") {
        await softDeleteInterestCharge(teamId, deleteConfirm.id, actorId);
        setInterestCharges((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      }
      setDeleteConfirm(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      const typeLabel = deleteConfirm.type === "fine" ? "bøde" : "rentegebyr";
      setErrorMessage(`Kunne ikke slette ${typeLabel} (${message}).`);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleDeleteClick(id: string, title: string, amount: number, type: DeleteConfirmationType): void {
    setDeleteConfirm({ type, id, title, amount });
  }

  const outstanding = balance?.outstandingBalance ?? 0;
  const pending = balance?.pendingBalance ?? 0;
  const approved = balance?.approvedBalance ?? 0;

  // Calculate unpaid interest charges (not included in payment)
  const unpaidInterestTotal = interestCharges.reduce((sum, charge) => sum + charge.amount, 0);

  // Total outstanding includes both fines balance and unpaid interest
  const totalOutstanding = outstanding + unpaidInterestTotal;

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-page">
      {/* Back button and warning */}
      <div className="profile-header-top">
        <button
          onClick={onBack}
          className="back-button"
          aria-label="Tilbage til holdoversigt"
        >
          ← Tilbage
        </button>
        {unpaidInterestTotal > 0 && (
          <div className="profile-warning">
            <p className="profile-warning__text">
              Du har ubetalte bøder fra sidste måned! Dine renter er nu {formatAmount(unpaidInterestTotal)}
            </p>
          </div>
        )}
      </div>

      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <h1 className="app-title">{userName}</h1>
        {canAssignFines(actorRole) && (
          <p className="text-[var(--color-text-muted)] mt-1" style={{ fontSize: 'x-small' }}>ID: {userId}</p>
        )}
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
                <div className="balance-card__value">{formatAmount(totalOutstanding)}</div>
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
                      
                      <span
                        className={`fine-item__status fine-item__status--${fine.paymentStatus}`}
                      >
                        {fine.paymentStatus === "unpaid" && "Ubetalt"}
                        {fine.paymentStatus === "pending" && "Afventer"}
                        {fine.paymentStatus === "approved" && "Godkendt"}
                        {fine.paymentStatus === "disputed" && "Afvist"}
                      </span>
                      <span className="fine-item__date">
                        {formatRelativeTime(fine.createdAt)}
                      </span>
                       {canDeleteFines(actorRole) && (
                      <div className="fine-item__actions">
                        <button
                          type="button"
                          className="btn-danger btn-delete-fine"
                          disabled={isDeleting}
                          onClick={() =>
                            handleDeleteClick(fine.id, fine.title, fine.amount, "fine")
                          }
                        >
                          {isDeleting ? "Sletter…" : "Slet bøde"}
                        </button>
                      </div>
                    )}
                    </div>
                    {fine.note && (
                      <div className="fine-item__note">{fine.note}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {deleteConfirm && (
              <div className="modal-overlay">
                <div className="modal-dialog">
                  <div className="modal-header">
                    <h3 className="modal-title">
                      {deleteConfirm.type === "fine" ? "Slet bøde?" : "Slet rentegebyr?"}
                    </h3>
                  </div>
                  <div className="modal-body">
                    <p>
                      Vil du slette {deleteConfirm.type === "fine" ? "bøden" : "rentegebyret"}{" "}
                      <strong>{deleteConfirm.title}</strong> ({formatAmount(deleteConfirm.amount)}) fra{" "}
                      {userName}?
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      ⚠️ Denne handling kan ikke fortrydes.
                      {deleteConfirm.type === "fine" && " Betalinger bliver stående for revision."}
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

          {/* Interest Charges */}
          <section className="profile-section">
            <div className="profile-section-header">
              <h2 className="profile-section-title">Renter</h2>
              {interestCharges.length > 0 && (
                <span className="profile-section-count">{interestCharges.length}</span>
              )}
            </div>
            {interestCharges.length === 0 && (
              <div className="empty-state py-6">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-sm">Ingen rentegebyrer i denne sæson.</p>
              </div>
            )}
            {interestCharges.length === 1 && (
              <div className="fine-list">
                {interestCharges.map((charge) => (
                  <div key={charge.id} className="fine-item">
                    <div className="fine-item__header">
                      <span className="fine-item__title">
                        Opkrævet {formatChargedDate(charge.chargedOn)}
                      </span>
                      <span className="fine-item__amount">
                        {formatAmount(charge.amount)}
                      </span>
                    </div>
                    {canDeleteInterestCharges(actorRole) && (
                      <div className="fine-item__actions mt-2">
                        <button
                          type="button"
                          className="btn-danger btn-delete-fine btn-delete-interest"
                          disabled={isDeleting}
                          onClick={() =>
                            handleDeleteClick(
                              charge.id,
                              `Rentegebyr ${formatChargedDate(charge.chargedOn)}`,
                              charge.amount,
                              "interest",
                            )
                          }
                        >
                          {isDeleting ? "Sletter…" : "Slet rente"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {interestCharges.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIsInterestsExpanded(!isInterestsExpanded)}
                  className="interests-accordion"
                  aria-expanded={isInterestsExpanded}
                >
                  <span>
                    {isInterestsExpanded
                      ? "Skjul alle rentegebyrer"
                      : `Vis alle ${interestCharges.length} rentegebyrer`}
                  </span>
                  <span className="interests-accordion-icon">
                    {isInterestsExpanded ? "−" : "+"}
                  </span>
                </button>

                {isInterestsExpanded && (
                  <div className="fine-list interests-list">
                    {interestCharges.map((charge) => (
                      <div key={charge.id} className="fine-item">
                        <div className="fine-item__header">
                          <span className="fine-item__title">
                            Opkrævet {formatChargedDate(charge.chargedOn)}
                          </span>
                          <span className="fine-item__amount">
                            {formatAmount(charge.amount)}
                          </span>
                        </div>
                        {canDeleteInterestCharges(actorRole) && (
                          <div className="fine-item__actions mt-2">
                            <button
                              type="button"
                              className="btn-danger btn-delete-fine btn-delete-interest"
                              disabled={isDeleting}
                              onClick={() =>
                                handleDeleteClick(
                                  charge.id,
                                  `Rentegebyr ${formatChargedDate(charge.chargedOn)}`,
                                  charge.amount,
                                  "interest",
                                )
                              }
                            >
                              {isDeleting ? "Sletter…" : "Slet rente"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
