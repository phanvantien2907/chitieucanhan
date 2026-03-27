/**
 * In-memory cache for instant placeholder data between navigations.
 * Not persisted by default (financial data); clear on sign-out.
 */
type Entry<T> = { value: T; expiresAt?: number };

export class MemoryCache {
  private readonly store = new Map<string, Entry<unknown>>();

  get<T>(key: string): T | undefined {
    const e = this.store.get(key) as Entry<T> | undefined;
    if (!e) return undefined;
    if (e.expiresAt != null && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt =
      ttlMs != null && ttlMs > 0 ? Date.now() + ttlMs : undefined;
    this.store.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const memoryCache = new MemoryCache();
