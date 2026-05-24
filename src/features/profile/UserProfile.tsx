// Feature: User Profile (F012)
import { useEffect, useState } from "react";
import {
  getFinesForUser,
  getPaymentsForUser,
  getTeam,
  updateUserProfile,
} from "../../lib/firestore";
import { buildMobilePayDeepLink, formatAmount } from "../../lib/utils";
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
  const [editedName, setEditedName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const [outstandingTotal, setOutstandingTotal] = useState<number | null>(null);
  const [mobilePayRecipient, setMobilePayRecipient] = useState<string | undefined>(
    undefined,
  );
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsReloadKey, setStatsReloadKey] = useState(0);

  // Sync editedName when parent displayName changes (e.g. after save)
  useEffect(() => {
    setEditedName(displayName);
  }, [displayName]);

  // Load financial stats and MobilePay recipient
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

        const userFineIds = new Set(fines.map((f) => f.id));

        // Compute paid and outstanding from payments for user's fines
        let paid = 0;
        let outstanding = 0;
        for (const p of payments) {
          if (!userFineIds.has(p.fineId)) continue;
          if (p.status === "approved") {
            paid += p.amount;
          } else if (p.status === "unpaid" || p.status === "pending" || p.status === "disputed") {
            outstanding += p.amount;
          }
        }

        setPaidTotal(paid);
        setOutstandingTotal(outstanding);
        setMobilePayRecipient(team?.mobilePayRecipient?.trim() || undefined);
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : "Ukendt fejl";
        setPaidTotal(0);
        setOutstandingTotal(0);
        setMobilePayRecipient(undefined);
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

  function handlePayNow(): void {
    if (!outstandingTotal || !mobilePayRecipient) return;

    const { nativeUrl, webUrl } = buildMobilePayDeepLink({
      amount: outstandingTotal,
      recipient: mobilePayRecipient,
      comment: "Bøder GSB",
    });

    // Try native app first, fallback to web in same tab if app did not open.
    let appOpened = false;
    const markAppOpened = (): void => {
      if (document.visibilityState === "hidden") appOpened = true;
    };
    const markAppOpenedOnPageHide = (): void => {
      appOpened = true;
    };

    document.addEventListener("visibilitychange", markAppOpened);
    window.addEventListener("pagehide", markAppOpenedOnPageHide);

    const link = document.createElement("a");
    link.href = nativeUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback after short delay only if app did not open.
    setTimeout(() => {
      document.removeEventListener("visibilitychange", markAppOpened);
      window.removeEventListener("pagehide", markAppOpenedOnPageHide);

      if (!appOpened) {
        window.location.assign(webUrl);
      }
    }, 1200);
  }

  const canSaveName =
    editedName.trim().length > 0 &&
    editedName.trim() !== displayName &&
    !isSaving;

  const hasMobilePayRecipient = (mobilePayRecipient ?? "").trim().length > 0;
  const canPayNow =
    !isLoadingStats &&
    (outstandingTotal ?? 0) > 0 &&
    hasMobilePayRecipient;

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
        !hasMobilePayRecipient && (
          <p className="status-note mt-2">
            MobilePay-modtager mangler for holdet. Kontakt en admin for at
            konfigurere modtageren.
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
