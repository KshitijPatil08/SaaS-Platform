declare module 'speakeasy' {
  export interface GeneratedSecret {
    ascii: string
    base32: string
    base64: string
    otpauth_url?: string
  }

  export interface TotpVerifyOptions {
    secret: string
    encoding?: 'ascii' | 'hex' | 'base32' | 'base64'
    token: string
    window?: number
  }

  export function generateSecret(options?: { name?: string; length?: number }): GeneratedSecret

  export const totp: {
    verify(options: TotpVerifyOptions): boolean
  }
}

declare module 'cookie-parser' {
  import { RequestHandler } from 'express'
  function cookieParser(secret?: string, options?: Record<string, unknown>): RequestHandler
  export = cookieParser
}
