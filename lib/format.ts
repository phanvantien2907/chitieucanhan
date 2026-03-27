/** Plain text / dates when value is missing (never use em dash in UI). */
export const DISPLAY_FALLBACK_EMPTY = "Không có";

/** Badge / label when value cannot be resolved. */
export const BADGE_UNKNOWN_FALLBACK = "Không xác định";

const UNSAFE_BADGE_DISPLAY = new Set(["", "-", "—", ".", "--"]);

/** Tailwind classes for unknown / fallback badge state (gray). */
export const BADGE_UNKNOWN_VISUAL =
  "rounded-full border border-border bg-muted text-muted-foreground";

/**
 * Safe text for shadcn Badge. Never returns null, undefined, empty string,
 * or common placeholder dashes — uses `fallback` instead.
 */
export function getSafeBadgeValue(
  value: unknown,
  fallback: string
): string {
  if (process.env.NODE_ENV === "development") {
    console.log("[badge] value:", value);
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  if (value === "") {
    return fallback;
  }
  const raw = typeof value === "string" ? value : String(value);
  const trimmed = raw.trim();
  if (trimmed === "" || UNSAFE_BADGE_DISPLAY.has(trimmed)) {
    return fallback;
  }
  return trimmed;
}
