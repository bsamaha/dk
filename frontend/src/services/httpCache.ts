// Lightweight in-memory HTTP cache and in-flight request deduplication
// - Designed to dedupe bursty GET requests to the same URL
// - Very small TTL by default to avoid stale data issues (defaults to 500ms)

type CacheEntry<T> = {
  createdAt: number;
  ttlMs: number;
  data: T;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlightStore = new Map<string, Promise<unknown>>();

// Enable cache by default in production, allow override via VITE_HTTP_CACHE
let cacheEnabled: boolean = typeof import.meta !== 'undefined'
  ? (import.meta as ImportMeta).env?.VITE_HTTP_CACHE !== undefined
    ? ((import.meta as ImportMeta).env.VITE_HTTP_CACHE as unknown as string) === 'true'
    : !!(import.meta as ImportMeta).env?.PROD
  : true;

function isFresh(entry: CacheEntry<unknown> | undefined): boolean {
  if (!entry) return false;
  return Date.now() - entry.createdAt < entry.ttlMs;
}

export function clearHttpCache(): void {
  cacheStore.clear();
}

export function getFromCache<T>(key: string): T | undefined {
  const entry = cacheStore.get(key);
  if (isFresh(entry)) {
    return entry?.data as T;
  }
  return undefined;
}

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 500
): Promise<T> {
  if (!cacheEnabled) {
    return fetcher();
  }
  // Serve from fresh cache
  const cached = getFromCache<T>(key);
  if (cached !== undefined) return Promise.resolve(cached);

  // Deduplicate in-flight requests
  const existing = inFlightStore.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then(result => {
      cacheStore.set(key, { createdAt: Date.now(), ttlMs, data: result });
      inFlightStore.delete(key);
      return result;
    })
    .catch(err => {
      inFlightStore.delete(key);
      throw err;
    });

  inFlightStore.set(key, promise as Promise<unknown>);
  return promise;
}

// Allow per-endpoint TTL constants to live here for documentation
export const HTTP_CACHE_TTL = {
  METADATA: 500,
  POSITION_STATS: 500,
  ROUND_COUNTS: 400,
  COMBINATIONS: 400,
  ROSTER_CONSTRUCTION: 500,
  ROSTER_COUNTS: 400,
  TEAMS: 500,
} as const;

export function setHttpCacheEnabled(enabled: boolean): void {
  cacheEnabled = enabled;
}

export function enableHttpCache(): void {
  setHttpCacheEnabled(true);
}

export function disableHttpCache(): void {
  setHttpCacheEnabled(false);
}

export function isHttpCacheEnabled(): boolean {
  return cacheEnabled;
}

export function bustHttpCache(): void {
  cacheStore.clear();
  inFlightStore.clear();
}
