/**
 * Constructs a MobilePay deep-link URL for initiating a payment.
 *
 * Falls back to the MobilePay web URL if the native app is not installed.
 */
export function buildMobilePayDeepLink(params: {
  amount: number;
  recipient: string;
  comment: string;
}): { nativeUrl: string; webUrl: string } {
  const encodedComment = encodeURIComponent(params.comment);
  const nativeUrl = `mobilepay://send?amount=${params.amount}&recipient=${params.recipient}&comment=${encodedComment}`;
  const webUrl = `https://mobilepay.dk/apps/sms?amount=${params.amount}&recipient=${params.recipient}&comment=${encodedComment}`;
  return { nativeUrl, webUrl };
}

/** Formats a DKK amount for display (e.g. 50 → "50 kr.") */
export function formatAmount(amount: number): string {
  return `${amount} kr.`;
}

/** Formats a relative timestamp for activity log display */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "Lige nu";
  if (diffMinutes < 60) return `${diffMinutes} min. siden`;
  if (diffHours < 24) return `${diffHours} time${diffHours !== 1 ? "r" : ""} siden`;
  if (diffDays < 7) return `${diffDays} dag${diffDays !== 1 ? "e" : ""} siden`;
  return date.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}
