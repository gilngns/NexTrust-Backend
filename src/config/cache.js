// In-memory SWR cache (Stale-While-Revalidate)
const store = new Map();

/**
 * Returns cached data if fresh, otherwise calls `fn` and caches the result.
 * @param {string} key   Cache key (supports prefix matching for invalidation)
 * @param {number} ttl   Time-to-live in milliseconds
 * @param {Function} fn  Async factory that produces the fresh value
 */
export async function cachedSWR(key, ttl, fn) {
  const entry = store.get(key);
  const now = Date.now();

  if (entry && now - entry.ts < ttl) {
    return entry.data;
  }

  const data = await fn();
  store.set(key, { data, ts: now });
  return data;
}

/**
 * Invalidate all cache keys that start with the given prefix.
 * @param {string} prefix
 */
export function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
