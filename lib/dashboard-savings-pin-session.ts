/** Short-lived unlock for viewing total savings on the dashboard (path `/dashboard`). */
export const DASHBOARD_SAVINGS_UNLOCKED_COOKIE_NAME =
  "dashboard_savings_unlocked" as const;

const COOKIE_MAX_AGE_SEC = 15 * 60;

export function setDashboardSavingsUnlockedCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${DASHBOARD_SAVINGS_UNLOCKED_COOKIE_NAME}=true; path=/dashboard; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

export function clearDashboardSavingsUnlockedCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${DASHBOARD_SAVINGS_UNLOCKED_COOKIE_NAME}=; path=/dashboard; max-age=0; SameSite=Lax`;
}

export function isDashboardSavingsUnlockedCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${DASHBOARD_SAVINGS_UNLOCKED_COOKIE_NAME}=true`);
}
