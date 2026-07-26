import { describe, it, expect } from 'vitest'
import { config } from './config'

describe('config module', () => {
  it('loads valid configuration properties', () => {
    expect(config).toBeDefined()
    expect(typeof config.rateLimitWindowMs).toBe('number')
    expect(typeof config.jwtSecret).toBe('string')
    expect(typeof config.cookieSecret).toBe('string')
  })
})
