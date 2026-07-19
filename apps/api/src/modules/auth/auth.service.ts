import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import speakeasy from 'speakeasy'
import { prisma } from '../shared/lib/prisma'
import type { LoginInput, RegisterInput, MfaEnrollInput, MfaConfirmInput } from './auth.schema'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResult {
  success: boolean
  tokens?: AuthTokens
  mfaRequired?: boolean
}

const ACCESS_MAX_AGE = 15 * 60 * 1000
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function issueTokens(companyId: string): AuthTokens {
  return {
    accessToken: jwt.sign({ companyId }, JWT_SECRET, { expiresIn: '15m' }),
    refreshToken: jwt.sign({ companyId }, JWT_REFRESH_SECRET, { expiresIn: '7d' }),
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: ACCESS_MAX_AGE,
}

// Constant-time-ish failure to avoid user enumeration
async function consumeCpu() {
  await bcrypt.compare('dummy-hash-to-consume-cpu', '$2b$10$dummy')
}

export const authService = {
  async login(input: LoginInput): Promise<LoginResult> {
    const admin = await prisma.adminUser.findFirst({ where: { email: input.email } })
    if (!admin) {
      await consumeCpu()
      return { success: false }
    }

    const valid = await bcrypt.compare(input.password, admin.password_hash)
    if (!valid) {
      return { success: false }
    }

    if (admin.mfa_enabled) {
      if (!input.mfaToken) {
        return { success: false, mfaRequired: true }
      }
      const ok = speakeasy.totp.verify({
        secret: admin.mfa_secret ?? '',
        encoding: 'base32',
        token: input.mfaToken,
        window: 1,
      })
      if (!ok) {
        return { success: false }
      }
    }

    return { success: true, tokens: issueTokens(admin.company_id) }
  },

  async enrollMfa(input: MfaEnrollInput) {
    const admin = await prisma.adminUser.findFirst({ where: { email: input.email } })
    if (!admin || !(await bcrypt.compare(input.password, admin.password_hash))) {
      throw new Error('Invalid credentials')
    }
    const secret = speakeasy.generateSecret({ name: `Pulse:${input.email}` })
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { mfa_secret: secret.base32 },
    })
    return { otpauthUrl: secret.otpauth_url, secret: secret.base32 }
  },

  async confirmMfa(input: MfaConfirmInput) {
    const admin = await prisma.adminUser.findFirst({ where: { email: input.email } })
    if (!admin || !admin.mfa_secret) {
      throw new Error('Enroll MFA first')
    }
    const ok = speakeasy.totp.verify({
      secret: admin.mfa_secret,
      encoding: 'base32',
      token: input.token,
      window: 1,
    })
    if (!ok) {
      throw new Error('Invalid token')
    }
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { mfa_enabled: true },
    })
    return { success: true, mfa_enabled: true }
  },

  async register(input: RegisterInput) {
    const existing = await prisma.adminUser.findFirst({ where: { email: input.email } })
    if (existing) {
      throw new Error('Email already registered')
    }
    const password_hash = await bcrypt.hash(input.password, 12)
    const company = await prisma.company.create({
      data: {
        name: input.companyName,
        admins: { create: { email: input.email, password_hash } },
      },
    })
    return { success: true, companyId: company.id }
  },

  issueTokens,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
}
