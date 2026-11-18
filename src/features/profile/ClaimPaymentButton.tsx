// F032: Payment Claim Button
// Component to display "Jeg har betalt" button for pending payments

import { useState } from "react";
import type { Payment } from "../../types/domain";
import { claimPayment } from "../../lib/firestore/payments";
import "./claim-payment.css";

interface ClaimPaymentProps {
  teamId: string;
  payment: Payment;
  userId: string;
  onClaimed: () => void;
}

export default function ClaimPaymentButton({
  teamId,
  payment,
  userId,
  onClaimed,
}: ClaimPaymentProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (payment.status !== "pending" || payment.userId !== userId) {
    return null;
  }

  async function handleClaim(): Promise<void> {
    setIsClaiming(true);
    setError(null);

    try {
      await claimPayment(teamId, payment.id, userId);
      setShowConfirmation(true);
      onClaimed();

      // Auto-hide confirmation after 5 seconds
      setTimeout(() => {
        setShowConfirmation(false);
      }, 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukendt fejl";
      setError(`Kunne ikke registrere betaling (${message}).`);
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <div className="claim-payment">
      {error && <p className="claim-payment__error">{error}</p>}

      {showConfirmation && (
        <div className="claim-payment__confirmation">
          <span className="claim-payment__icon">✓</span>
          <p className="claim-payment__message">
            Din betaling venter på godkendelse. Du får besked når den er behandlet.
          </p>
        </div>
      )}

      {!showConfirmation && (
        <button
          type="button"
          className="claim-payment__button"
          onClick={() => void handleClaim()}
          disabled={isClaiming}
          aria-label="Bekræft at betaling er foretaget"
        >
          <span className="claim-payment__icon">✓</span>
          <span className="claim-payment__text">
            {isClaiming ? "Registrerer…" : "Jeg har betalt"}
          </span>
        </button>
      )}
    </div>
  );
}
