// Feature: User Profile (F012)
import { useCallback, useEffect, useState } from "react";
import {
  createCombinedPayment,
  getFinesForUser,
  getPaymentsForUser,
  getTeam,
  updateUserProfile,
} from "../../lib/firestore";
import { formatAmount } from "../../lib/utils";
import "./profile.css";

interface UserProfileProps {
  userId: string;
  teamId: string;
  email: string;
  displayName: string;
  onNameChange: (newName: string) => void;
}

export default function UserProfile({
  userId,
  teamId,
  email,
  displayName,
  onNameChange,
}: UserProfileProps) {
  const paymentDraftStorageKey = `gsb:payment-draft:${teamId}:${userId}`;
  const [editedName, setEditedName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const [outstandingTotal, setOutstandingTotal] = useState<number | null>(null);
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);
  const [unpaidFineIds, setUnpaidFineIds] = useState<string[]>([]);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [mobilePayBoxUrl, setMobilePayBoxUrl] = useState<string | undefined>(
    undefined,
  );
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsReloadKey, setStatsReloadKey] = useState(0);

  // Sync editedName when parent displayName changes (e.g. after save)
  useEffect(() => {
    setEditedName(displayName);
  }, [displayName]);

  /**
   * Helper to get fine IDs from a payment, handling backward compatibility.
   */
  function getFineIdsFromPayment(payment: { fineId?: string; fineIds?: string[] }): string[] {
    if (payment.fineIds && payment.fineIds.length > 0) {
      return payment.fineIds;
    }
    if (payment.fineId) {
      return [payment.fineId];
    }
    return [];
  }

  // Load financial stats and MobilePay Box URL
  useEffect(() => {
    let isActive = true;

    async function loadStats(): Promise<void> {
      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const [fines, payments, team] = await Promise.all([
          getFinesForUser(teamId, userId),
          getPaymentsForUser(teamId, userId),
          getTeam(teamId),
        ]);

        if (!isActive) return;

        const pendingFineIds = new Set<string>();
        const approvedFineIds = new Set<string>();
        for (const p of payments) {
          const fineIds = getFineIdsFromPayment(p);
          if (p.status === "pending") {
            fineIds.forEach((id) => pendingFineIds.add(id));
          }
          if (p.status === "approved") {
            fineIds.forEach((id) => approvedFineIds.add(id));
          }
        }

        // Compute totals per fine to avoid double counting when both unpaid+pending payment records exist
        let paid = 0;
        let outstanding = 0;
        let pending = 0;
        const unpaidIds: string[] = [];

        for (const fine of fines) {
          if (approvedFineIds.has(fine.id)) {
            paid += fine.amount;
          } else if (pendingFineIds.has(fine.id)) {
            pending += fine.amount;
          } else {
            outstanding += fine.amount;
            unpaidIds.push(fine.id);
          }
        }

        setPaidTotal(paid);
        setOutstandingTotal(outstanding);
        setPendingTotal(pending);
        setUnpaidFineIds(unpaidIds);
        setMobilePayBoxUrl(team?.mobilePayBoxUrl?.trim() || undefined);
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : "Ukendt fejl";
        setPaidTotal(0);
        setOutstandingTotal(0);
        setPendingTotal(0);
        setUnpaidFineIds([]);
        setMobilePayBoxUrl(undefined);
        setStatsError(`Kunne ikke hente betalingsoversigt (${message}).`);
      } finally {
        if (isActive) setIsLoadingStats(false);
      }
    }

    void loadStats();

    return () => {
      isActive = false;
    };
  }, [userId, teamId, statsReloadKey]);

  async function handleSaveName(): Promise<void> {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === displayName) return;

    setIsSaving(true);
    setSaveFeedback(null);

    try {
      await updateUserProfile(userId, { name: trimmed });
      onNameChange(trimmed);
      setSaveFeedback({ type: "success", message: "Brugernavn gemt ✓" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      setSaveFeedback({
        type: "error",
        message: `Kunne ikke gemme (${message})`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  const settlePaymentDraft = useCallback(async (): Promise<void> => {
    if (isRegisteringPayment) return;

    const rawDraft = window.sessionStorage.getItem(paymentDraftStorageKey);
    if (!rawDraft) return;

    type PaymentDraft = { fineIds: string[]; amount: number };
    let parsed: PaymentDraft | null = null;
    try {
      parsed = JSON.parse(rawDraft) as PaymentDraft;
    } catch {
      window.sessionStorage.removeItem(paymentDraftStorageKey);
      return;
    }

    if (!parsed || parsed.fineIds.length === 0 || parsed.amount <= 0) {
      window.sessionStorage.removeItem(paymentDraftStorageKey);
      return;
    }

    setIsRegisteringPayment(true);
    setPaymentFeedback(null);
    window.sessionStorage.removeItem(paymentDraftStorageKey);

    try {
      await createCombinedPayment(
        teamId,
        parsed.fineIds,
        userId,
        parsed.amount,
        userId,
      );
      setPaymentFeedback({
        type: "success",
        message:
          "Din betaling er modtaget. En admin vil godkende hurtigst muligt.",
      });
      setStatsReloadKey((prev) => prev + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl";
      if (message.includes("allerede i gang")) {
        setPaymentFeedback({
          type: "success",
          message:
            "Din betaling er registreret som afventer godkendelse.",
        });
        setStatsReloadKey((prev) => prev + 1);
      } else {
        setPaymentFeedback({
          type: "error",
          message: `Kunne ikke registrere betaling (${message}).`,
        });
      }
    } finally {
      setIsRegisteringPayment(false);
    }
  }, [isRegisteringPayment, paymentDraftStorageKey, teamId, userId]);

  useEffect(() => {
    const handleFocus = () => {
      void settlePaymentDraft();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void settlePaymentDraft();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    void settlePaymentDraft();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [settlePaymentDraft]);

  function handlePayNow(): void {
    if (!outstandingTotal || !mobilePayBoxUrl || unpaidFineIds.length === 0) return;

    setPaymentFeedback(null);
    window.sessionStorage.setItem(
      paymentDraftStorageKey,
      JSON.stringify({ fineIds: unpaidFineIds, amount: outstandingTotal }),
    );

    try {
      // Open MobilePay Box in a new tab
      window.open(mobilePayBoxUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.sessionStorage.removeItem(paymentDraftStorageKey);
      setPaymentFeedback({
        type: "error",
        message: "Kunne ikke åbne MobilePay. Prøv igen.",
      });
    }
  }

  const canSaveName =
    editedName.trim().length > 0 &&
    editedName.trim() !== displayName &&
    !isSaving;

  const hasMobilePayBoxUrl = (mobilePayBoxUrl ?? "").trim().length > 0;
  const canPayNow =
    !isLoadingStats &&
    (outstandingTotal ?? 0) > 0 &&
    hasMobilePayBoxUrl &&
    unpaidFineIds.length > 0 &&
    !isRegisteringPayment;

  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="profile-page">
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">{initials || "👤"}</div>
        <p className="profile-hero__name">{displayName}</p>
        <p className="profile-hero__email">{email}</p>
      </div>

      {/* Financial summary */}
      {statsError && (
        <div className="profile-stats-error">
          <p className="status-error">{statsError}</p>
          <button
            type="button"
            className="btn-secondary profile-retry-btn"
            onClick={() => {
              setStatsReloadKey((prev) => prev + 1);
            }}
            disabled={isLoadingStats}
          >
            Prøv igen
          </button>
        </div>
      )}

      <div className="profile-stats">
        <div className="profile-stat-card profile-stat-card--paid">
          <span className="profile-stat-card__emoji">✅</span>
          <span className="profile-stat-card__label">Indbetalt i alt</span>
          <span className="profile-stat-card__value">
            {isLoadingStats ? "…" : formatAmount(paidTotal ?? 0)}
          </span>
        </div>
        <div className="profile-stat-card profile-stat-card--outstanding">
          <span className="profile-stat-card__emoji">⏳</span>
          <span className="profile-stat-card__label">Udestående</span>
          <span className="profile-stat-card__value">
            {isLoadingStats ? "…" : formatAmount(outstandingTotal ?? 0)}
          </span>
        </div>
      </div>

      {/* Pay now */}
      <button
        type="button"
        className="profile-pay-btn"
        onClick={handlePayNow}
        disabled={!canPayNow}
        aria-label="Betal udestående bøder via MobilePay"
      >
        <span>💸</span>
        <span>
          Betal nu
          {canPayNow ? ` – ${formatAmount(outstandingTotal ?? 0)}` : ""}
        </span>
      </button>
      {!isLoadingStats &&
        (outstandingTotal ?? 0) > 0 &&
        !hasMobilePayBoxUrl && (
          <p className="status-note mt-2">
            MobilePay Box URL mangler for holdet. Kontakt en admin for at
            konfigurere den.
          </p>
        )}
      {paymentFeedback && (
        <p className={`profile-feedback profile-feedback--${paymentFeedback.type}`}>
          {paymentFeedback.message}
        </p>
      )}
      {!isLoadingStats && (pendingTotal ?? 0) > 0 && (
        <p className="status-note mt-2">
          Midlertidigt betalt: {formatAmount(pendingTotal ?? 0)} (afventer
          godkendelse)
        </p>
      )}

      {/* Profile fields */}
      <div className="profile-section">
        <p className="profile-section__title">Kontooplysninger</p>

        {/* Email — read only */}
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="profile-email">
            E-mail
          </label>
          <input
            id="profile-email"
            type="email"
            className="profile-field__input"
            value={email}
            disabled
            aria-disabled="true"
            readOnly
          />
        </div>

        {/* Username — editable */}
        <div className="profile-field">
          <label className="profile-field__label" htmlFor="profile-name">
            Brugernavn
          </label>
          <div className="profile-name-row">
            <input
              id="profile-name"
              type="text"
              className="profile-field__input"
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value);
                setSaveFeedback(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSaveName) {
                  void handleSaveName();
                }
              }}
              maxLength={60}
              placeholder="Dit brugernavn"
              aria-label="Brugernavn"
            />
            <button
              type="button"
              className="profile-name-save-btn"
              onClick={() => void handleSaveName()}
              disabled={!canSaveName}
              aria-label="Gem brugernavn"
            >
              Gem
            </button>
          </div>
          {saveFeedback && (
            <p
              className={`profile-feedback profile-feedback--${saveFeedback.type}`}
            >
              {saveFeedback.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
