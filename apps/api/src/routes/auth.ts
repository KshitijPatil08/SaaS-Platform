import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import speakeasy from 'speakeasy'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh'

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  mfaToken: z.string().length(6).optional(),
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials format' })
  }

  const { email, password, mfaToken } = parsed.data

  const admin = await prisma.adminUser.findFirst({ where: { email } })
  if (!admin) {
    // Constant-time failure to avoid user enumeration
    await bcrypt.compare('dummy-hash-to-consume-cpu', '$2b$10$dummy')
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // MFA enforcement
  if (admin.mfa_enabled) {
    if (!mfaToken) {
      return res.status(401).json({ error: 'MFA token required', mfaRequired: true })
    }
    const ok = speakeasy.totp.verify({
      secret: admin.mfa_secret ?? '',
      encoding: 'base32',
      token: mfaToken,
      window: 1,
    })
    if (!ok) {
      return res.status(401).json({ error: 'Invalid MFA token' })
    }
  }

  const accessToken = jwt.sign({ companyId: admin.company_id }, JWT_SECRET, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ companyId: admin.company_id }, JWT_REFRESH_SECRET, { expiresIn: '7d' })

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  return res.json({ success: true })
})

// POST /api/auth/mfa/enroll  — begins TOTP enrollment, returns otpauth URL + secret
router.post('/mfa/enroll', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { email, password } = parsed.data
  const admin = await prisma.adminUser.findFirst({ where: { email } })
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const secret = speakeasy.generateSecret({ name: `Pulse:${email}` })
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { mfa_secret: secret.base32 },
  })

  return res.json({ otpauthUrl: secret.otpauth_url, secret: secret.base32 })
})

// POST /api/auth/mfa/confirm  — verifies first TOTP and enables MFA
router.post('/mfa/confirm', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    token: z.string().length(6),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { email, token } = parsed.data
  const admin = await prisma.adminUser.findFirst({ where: { email } })
  if (!admin || !admin.mfa_secret) {
    return res.status(400).json({ error: 'Enroll MFA first' })
  }

  const ok = speakeasy.totp.verify({
    secret: admin.mfa_secret,
    encoding: 'base32',
    token,
    window: 1,
  })
  if (!ok) return res.status(401).json({ error: 'Invalid token' })

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { mfa_enabled: true },
  })
  return res.json({ success: true, mfa_enabled: true })
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('access_token')
  res.clearCookie('refresh_token')
  return res.json({ success: true })
})

// POST /api/auth/register  — create a company + first admin (bootstrap)
const registerSchema = z.object({
  companyName: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration data' })
  }

  const { companyName, email, password } = parsed.data

  const existing = await prisma.adminUser.findFirst({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const company = await prisma.company.create({
    data: {
      name: companyName,
      admins: {
        create: { email, password_hash },
      },
    },
  })

  return res.status(201).json({ success: true, companyId: company.id })
})

export default router
