/** Client-only cookie to skip PIN dialog after successful verification (short TTL). */
export const SAVINGS_PIN_VERIFIED_COOKIE_NAME = "savings_pin_verified" as const;

const COOKIE_MAX_AGE_SEC = 15 * 60;

export function setSavingsPinVerifiedCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${SAVINGS_PIN_VERIFIED_COOKIE_NAME}=true; path=/dashboard/savings; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function clearSavingsPinVerifiedCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${SAVINGS_PIN_VERIFIED_COOKIE_NAME}=; path=/dashboard/savings; max-age=0; SameSite=Lax`;
}

export function isSavingsPinVerifiedCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${SAVINGS_PIN_VERIFIED_COOKIE_NAME}=true`);
}
