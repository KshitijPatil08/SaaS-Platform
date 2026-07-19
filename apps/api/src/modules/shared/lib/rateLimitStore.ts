import type { Store, Options } from 'express-rate-limit'
import { MemoryStore } from 'express-rate-limit'
import Redis from 'ioredis'
import { config } from './config'

/**
 * Builds the Store used by an express-rate-limit limiter.
 *
 * - If `REDIS_URL` is configured → a Redis-backed store, so every API
 *   instance shares ONE hit counter. This is what makes rate limiting
 *   correct when the API is scaled horizontally (multiple replicas).
 * - If `REDIS_URL` is not set → the default in-memory store (fine for
 *   single-instance dev).
 *
 * The Redis store fails OPEN: if Redis is unreachable it transparently
 * falls back to a per-instance in-memory counter so requests are never
 * blocked (rate limiting degrades rather than 500-ing).
 */
export function createRateLimitStore(prefix: string): Store {
  if (!config.redisUrl) {
    console.warn(
      `[rate-limit] REDIS_URL not set — using in-memory store for "${prefix}" (not shared across instances).`
    )
    return new MemoryStore()
  }
  return new RedisRateLimitStore(prefix)
}

class RedisRateLimitStore implements Store {
  private redis: Redis
  private keyPrefix: string
  private windowMs = 60_000
  // Per-instance fallback used only when Redis is down.
  private fallback = new Map<string, { hits: number; expires: number }>()
  private usingFallback = false

  constructor(prefix: string) {
    this.keyPrefix = prefix
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    })
    this.redis.on('error', (err: Error) => {
      if (!this.usingFallback) {
        this.usingFallback = true
        console.error(
          `[rate-limit] Redis error for "${prefix}", falling back to in-memory:`,
          err.message
        )
      }
    })
  }

  init(options: Options): void {
    this.windowMs = options.windowMs
    // Best-effort connect; failures are handled by the error listener.
    this.redis.connect().catch(() => {
      /* handled by error listener → fallback */
    })
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    if (this.usingFallback) return this.incrementFallback(key)
    const redisKey = `${this.keyPrefix}:${key}`
    const now = Date.now()
    try {
      const pipeline = this.redis.multi()
      pipeline.incr(redisKey)
      pipeline.pttl(redisKey)
      const res = await pipeline.exec()
      if (!res) return this.incrementFallback(key)

      const hits = res[0][1] as number
      let ttl = res[1][1] as number
      // First hit in the window: key has no TTL yet, set the expiry.
      if (ttl === -1) {
        await this.redis.pexpire(redisKey, this.windowMs)
        ttl = this.windowMs
      }
      const resetTime = ttl > 0 ? new Date(now + ttl) : undefined
      return { totalHits: hits, resetTime }
    } catch {
      return this.incrementFallback(key)
    }
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `${this.keyPrefix}:${key}`
    if (this.usingFallback) {
      this.fallback.delete(redisKey)
      return
    }
    try {
      await this.redis.del(redisKey)
    } catch {
      /* ignore — fallback covers it */
    }
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `${this.keyPrefix}:${key}`
    if (this.usingFallback) {
      const existing = this.fallback.get(redisKey)
      if (existing) existing.hits = Math.max(0, existing.hits - 1)
      return
    }
    try {
      await this.redis.decr(redisKey)
    } catch {
      /* ignore — fallback covers it */
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.redis.disconnect()
    } catch {
      /* ignore */
    }
  }

  private incrementFallback(key: string): { totalHits: number; resetTime: Date | undefined } {
    const fk = `${this.keyPrefix}:${key}`
    const now = Date.now()
    const existing = this.fallback.get(fk)
    if (existing && existing.expires > now) {
      existing.hits += 1
      return { totalHits: existing.hits, resetTime: new Date(existing.expires) }
    }
    this.fallback.set(fk, { hits: 1, expires: now + this.windowMs })
    return { totalHits: 1, resetTime: new Date(now + this.windowMs) }
  }
}
