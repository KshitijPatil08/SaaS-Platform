interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()
const DEFAULT_TTL_MS = 60 * 1000 // 60 seconds TTL

export const kpiCache = {
  get<T>(key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      cache.delete(key)
      return null
    }
    return entry.data
  },

  set<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  },

  invalidate(keyPrefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        cache.delete(key)
      }
    }
  },

  clear(): void {
    cache.clear()
  },
}
