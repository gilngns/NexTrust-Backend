
const store = new Map();

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

export function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
