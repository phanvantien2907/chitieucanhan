/** Dev-only timing helpers for fetch/render diagnostics. */

const isDev =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

export function devPerfFetch(label: string, ms: number): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console -- intentional dev perf log
  console.debug(`[perf] fetch ${label}: ${ms.toFixed(0)}ms`);
}

export function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isDev) return fn();
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  return fn().then((result) => {
    const t1 =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    devPerfFetch(label, t1 - t0);
    return result;
  });
}
