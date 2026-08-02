import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import speakeasy from 'speakeasy'
import { prisma } from '../shared/lib/prisma'
import { config } from '../shared/lib/config'
import type { LoginInput, RegisterInput, MfaEnrollInput, MfaConfirmInput } from './auth.schema'

const JWT_SECRET = config.jwtSecret
const JWT_REFRESH_SECRET = config.jwtRefreshSecret

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResult {
  success: boolean
  tokens?: AuthTokens
  mfaRequired?: boolean
  companyId?: string
  adminEmail?: string
}

const ACCESS_MAX_AGE = 15 * 60 * 1000
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000

function issueTokens(companyId: string, adminEmail?: string): AuthTokens {
  return {
    accessToken: jwt.sign({ companyId, adminEmail }, JWT_SECRET, { expiresIn: '15m' }),
    refreshToken: jwt.sign({ companyId, adminEmail }, JWT_REFRESH_SECRET, { expiresIn: '7d' }),
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict' as const,
  maxAge: ACCESS_MAX_AGE,
}

const DUMMY_HASH = bcrypt.hashSync('dummy-consumes-cpu', 10)

async function consumeCpu() {
  await bcrypt.compare('dummy-hash-to-consume-cpu', DUMMY_HASH)
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
      return { success: false, companyId: admin.company_id, adminEmail: admin.email }
    }

    if (admin.mfa_enabled) {
      if (!input.mfaToken) {
        return { success: false, mfaRequired: true, companyId: admin.company_id, adminEmail: admin.email }
      }
      const ok = speakeasy.totp.verify({
        secret: admin.mfa_secret ?? '',
        encoding: 'base32',
        token: input.mfaToken,
        window: 1,
      })
      if (!ok) {
        return { success: false, companyId: admin.company_id, adminEmail: admin.email }
      }
    }

    return {
      success: true,
      tokens: issueTokens(admin.company_id, admin.email),
      companyId: admin.company_id,
      adminEmail: admin.email,
    }
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

  async getProfile(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        admins: {
          select: {
            id: true,
            email: true,
            mfa_enabled: true,
            created_at: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    })
    if (!company) throw new Error('Company not found')
    const primaryAdmin = company.admins[0]
    return {
      companyId: company.id,
      companyName: company.name,
      stripeId: company.stripe_id,
      admin: primaryAdmin ? { email: primaryAdmin.email, mfaEnabled: primaryAdmin.mfa_enabled } : null,
      admins: company.admins.map(a => ({
        id: a.id,
        email: a.email,
        mfaEnabled: a.mfa_enabled,
        createdAt: a.created_at,
      })),
      webhookUrl: `${config.clientOrigin.replace(':3000', ':5000')}/webhooks/stripe?company_id=${company.id}`,
    }
  },

  async inviteAdmin(companyId: string, email: string, initialPassword?: string) {
    const existing = await prisma.adminUser.findFirst({ where: { email } })
    if (existing) {
      throw new Error('User with this email is already registered')
    }
    const tempPassword = initialPassword || 'PulseAdmin2026!'
    const password_hash = await bcrypt.hash(tempPassword, 12)
    const newAdmin = await prisma.adminUser.create({
      data: {
        company_id: companyId,
        email,
        password_hash,
      },
    })
    return {
      id: newAdmin.id,
      email: newAdmin.email,
      tempPassword,
      created_at: newAdmin.created_at,
    }
  },

  async updateProfile(
    companyId: string,
    data: { companyName?: string; email?: string; currentPassword?: string; newPassword?: string; stripeId?: string }
  ) {
    const admin = await prisma.adminUser.findFirst({ where: { company_id: companyId } })
    if (!admin) throw new Error('Admin user not found')

    if (data.newPassword) {
      if (!data.currentPassword) throw new Error('Current password is required to change password')
      const valid = await bcrypt.compare(data.currentPassword, admin.password_hash)
      if (!valid) throw new Error('Current password is incorrect')
      const password_hash = await bcrypt.hash(data.newPassword, 12)
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { password_hash },
      })
    }

    if (data.email && data.email !== admin.email) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { email: data.email },
      })
    }

    if (data.companyName || data.stripeId !== undefined) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          ...(data.companyName ? { name: data.companyName } : {}),
          ...(data.stripeId !== undefined ? { stripe_id: data.stripeId } : {}),
        },
      })
    }

    return this.getProfile(companyId)
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
    const tokens = issueTokens(company.id, input.email)
    return { success: true, companyId: company.id, tokens }
  },

  async forgotPassword(email: string) {
    const admin = await prisma.adminUser.findFirst({ where: { email } })
    if (!admin) {
      return { success: true, message: 'If that email is registered, reset instructions have been generated.' }
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await (prisma as any).passwordResetToken.create({
      data: {
        token,
        admin_id: admin.id,
        expires_at: expiresAt,
      },
    })

    const resetUrl = `${config.clientOrigin}/reset-password?token=${token}`

    return {
      success: true,
      message: 'Password reset link created.',
      resetUrl: config.isProduction ? undefined : resetUrl,
    }
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await (prisma as any).passwordResetToken.findUnique({
      where: { token },
      include: { admin: true },
    })

    if (!record || record.used || record.expires_at < new Date()) {
      throw new Error('Invalid or expired password reset token')
    }

    const password_hash = await bcrypt.hash(newPassword, 12)

    await prisma.adminUser.update({
      where: { id: record.admin_id },
      data: { password_hash },
    })

    await (prisma as any).passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    })

    return { success: true, message: 'Password has been reset successfully' }
  },

  issueTokens,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
}
