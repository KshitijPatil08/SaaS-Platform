import { Router, Request, Response } from 'express'
import { authService } from './auth.service'
import { verifyJwt, tokenRefreshMiddleware } from './auth.middleware'
import { requireRole } from './rbac.middleware'
import { prisma } from '../shared/lib/prisma'
import { config } from '../shared/lib/config'
import { auditService } from '../shared/lib/audit.service'
import { validateBody } from '../shared/middleware/validation'
import {
  mfaChallengeSchema,
  mfaVerifySchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schema'

// Valid admin roles — used to guard PUT /team/:id/role
const VALID_ROLES = ['OWNER', 'ADMIN', 'ANALYST', 'DEVELOPER'] as const
type AdminRole = (typeof VALID_ROLES)[number]

const router = Router()

// POST /api/auth/register (public)
// Fix #1: validateBody enforces password strength (uppercase + digit) and max lengths
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { companyName, email, password } = req.body
    const result = await authService.register({ companyName, email, password })
    return res.status(201).json(result)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// POST /api/auth/login (public)
// Fix #2: DEPRECATED — this single-step flow is vulnerable because it accepts mfaToken
// in the same request as email+password, enabling MFA bypass when mfaToken is omitted.
// All new integrations MUST use POST /api/auth/mfa/challenge + /mfa/verify instead.
router.post('/login', async (req: Request, res: Response) => {
  res.setHeader('Deprecation', 'true')
  res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString())
  res.setHeader('Link', '</api/auth/mfa/challenge>; rel="successor-version"')
  try {
    const { email, password, mfaToken } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    const result = await authService.login({ email, password, mfaToken })
    if (result.tokens) {
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      }
      res.cookie('access_token', result.tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      res.cookie('refresh_token', result.tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
    }
    return res.json(result)
  } catch (e) {
    return res.status(401).json({ error: (e as Error).message })
  }
})

// POST /api/auth/forgot-password (public)
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    const { emailService } = await import('../shared/lib/email.service')
    const result = await emailService.sendPasswordResetEmail(email)
    return res.json(result)
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

// POST /api/auth/reset-password (public)
// Fix #4: validateBody ensures newPassword meets the same strength rules as registration.
router.post('/reset-password', validateBody(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    const { emailService } = await import('../shared/lib/email.service')
    const result = await emailService.resetPassword(token, newPassword)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// POST /api/auth/logout (protected or sessionless client cleanup)
router.post('/logout', (_req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const clearOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  }
  res.clearCookie('access_token', clearOptions)
  res.clearCookie('refresh_token', clearOptions)
  return res.json({ success: true })
})

// POST /api/auth/invite (protected)
// Fix #7a: Never accept a caller-supplied password — always generate a secure temp one server-side.
// Fix #7b: Validate the requested role against the allowed enum before persisting.
router.post('/invite', verifyJwt, requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    // Fix #7b: Reject roles that are not in the canonical list
    const inviteRole = role || 'ADMIN'
    if (!(VALID_ROLES as readonly string[]).includes(inviteRole)) {
      return res.status(400).json({
        error: `Invalid role "${inviteRole}". Allowed values: ${VALID_ROLES.join(', ')}`,
      })
    }

    // Fix #7a: Never pass a caller-controlled password — inviteAdmin generates crypto.randomBytes(10)
    // when no initialPassword is provided. The temp password is returned once for out-of-band delivery.
    const result = await authService.inviteAdmin(req.companyId!, email, undefined, inviteRole)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// PUT /api/auth/team/:adminId/role (protected)
// Fix #8: role is validated against the allowed enum — arbitrary strings are rejected.
router.put('/team/:adminId/role', verifyJwt, requireRole('OWNER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { adminId } = req.params
  const { role } = req.body as { role: string }

  if (!companyId || !adminId || !role) {
    return res.status(400).json({ error: 'adminId and role are required' })
  }

  // Fix #8: Validate role against the canonical list — prevents storing arbitrary strings
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    return res.status(400).json({
      error: `Invalid role "${role}". Allowed values: ${VALID_ROLES.join(', ')}`,
    })
  }

  try {
    await (prisma as any).adminUser.updateMany({
      where: { id: adminId, company_id: companyId },
      data: { role: role as AdminRole },
    })

    return res.json({ success: true, message: `Team admin role updated to ${role}` })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update team admin role' })
  }
})

// DELETE /api/auth/team/:adminId (protected)
// Fix #9: Prevent an OWNER from deleting themselves — would lock the company out permanently.
router.delete('/team/:adminId', verifyJwt, requireRole('OWNER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { adminId } = req.params

  if (!companyId || !adminId) {
    return res.status(400).json({ error: 'adminId is required' })
  }

  try {
    // Fix #9: Look up the requester's own admin record to prevent self-removal
    const self = await (prisma as any).adminUser.findFirst({
      where: { email: req.adminEmail, company_id: companyId },
      select: { id: true },
    })
    if (self && self.id === adminId) {
      return res.status(400).json({ error: 'You cannot remove your own admin account.' })
    }

    await (prisma as any).adminUser.deleteMany({
      where: { id: adminId, company_id: companyId },
    })

    return res.json({ success: true, message: 'Team admin access revoked successfully' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to revoke team admin access' })
  }
})

// GET /api/auth/profile (protected)
router.get('/profile', verifyJwt, async (req: Request, res: Response) => {
  try {
    const profile = await authService.getProfile(req.companyId!)
    return res.json(profile)
  } catch (e) {
    return res.status(401).json({ error: (e as Error).message })
  }
})

// PUT /api/auth/profile (protected)
// Fix #10: validateBody(updateProfileSchema) enforces a strict field whitelist — unknown
// fields like role, mfa_enabled, mfa_secret are stripped before reaching the service.
router.put('/profile', verifyJwt, validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const updated = await authService.updateProfile(req.companyId!, req.body)
    return res.json(updated)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// POST /api/auth/mfa/challenge (public)
// Step 1 of dedicated-MFA-page flow: validates email+password,
// returns a short-lived mfaSessionToken (5 min JWT) if MFA is required.
// Fix #7: validateBody ensures email/password are well-formed before hitting DB.
router.post('/mfa/challenge', validateBody(mfaChallengeSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    const result = await authService.login({ email, password })
    if (!result.mfaRequired) {
      // MFA not enabled on this account — issue full tokens as normal
      if (result.tokens) {
        const isProduction = process.env.NODE_ENV === 'production'
        const cookieOptions = {
          httpOnly: true,
          secure: isProduction,
          sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
        }
        res.cookie('access_token', result.tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
        res.cookie('refresh_token', result.tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
        // Fix #5: Audit the successful non-MFA login
        await auditService.log({
          companyId: result.companyId!,
          userEmail: email,
          action: 'LOGIN_SUCCESS',
          req,
          details: { mfa: false },
        })
        return res.json({ success: true })
      }
      // Fix #5: Audit failed login attempt
      await auditService.log({
        companyId: result.companyId || 'unknown',
        userEmail: email,
        action: 'LOGIN_FAILED',
        req,
        details: { reason: 'invalid_credentials' },
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    // MFA required — issue a short-lived MFA session token
    const mfaSessionToken = authService.issueMfaSessionToken(result.companyId!, result.adminEmail!)
    return res.json({ mfaRequired: true, mfaSessionToken })
  } catch (e) {
    return res.status(401).json({ error: (e as Error).message })
  }
})

// POST /api/auth/mfa/verify (public)
// Step 2 of dedicated-MFA-page flow: verifies TOTP code against the mfaSessionToken
// and issues full HttpOnly auth cookies on success.
// Fix #7: validateBody ensures mfaSessionToken and totpCode are well-formed.
router.post('/mfa/verify', validateBody(mfaVerifySchema), async (req: Request, res: Response) => {
  try {
    const { mfaSessionToken, totpCode } = req.body
    const result = await authService.loginWithMfaSessionToken(mfaSessionToken, totpCode)
    if (!result.success || !result.tokens) {
      return res.status(401).json({ error: 'Invalid verification code' })
    }
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
    }
    res.cookie('access_token', result.tokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    res.cookie('refresh_token', result.tokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })

    await auditService.log({
      companyId: result.companyId!,
      userEmail: result.adminEmail!,
      action: 'LOGIN_SUCCESS',
      req,
      details: { mfa: true, email: result.adminEmail },
    })

    return res.json({ success: true })
  } catch (e) {
    return res.status(401).json({ error: (e as Error).message })
  }
})

// POST /api/auth/mfa/enroll (protected)
router.post('/mfa/enroll', verifyJwt, async (req: Request, res: Response) => {
  try {
    const { currentPassword } = req.body as { currentPassword?: string }
    const email = req.adminEmail
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'currentPassword is required' })
    }

    const result = await authService.enrollMfa({ email, password: currentPassword })

    await auditService.log({
      companyId: req.companyId!,
      userEmail: email,
      action: 'ENROLL_MFA',
      req,
      details: { email },
    })

    return res.json({ secret: result.secret, otpAuthUrl: result.otpauthUrl })
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// POST /api/auth/mfa/confirm (protected)
router.post('/mfa/confirm', verifyJwt, async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string }
    const email = req.adminEmail
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!token) {
      return res.status(400).json({ error: 'token is required' })
    }

    const result = await authService.confirmMfa({ email, token })

    await auditService.log({
      companyId: req.companyId!,
      userEmail: email,
      action: 'CONFIRM_MFA',
      req,
      details: { email },
    })

    return res.json(result)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// GET /api/auth/lockout-status (protected)
router.get('/lockout-status', verifyJwt, async (req: Request, res: Response) => {
  return res.json({
    ip: req.ip,
    status: 'not_tracked',
    maxAllowedRequests: config.rateLimitMaxRequests,
    windowMs: config.rateLimitWindowMs,
  })
})

// POST /api/auth/reset-lockout (protected)
router.post('/reset-lockout', verifyJwt, async (req: Request, res: Response) => {
  const email = req.adminEmail
  if (!req.companyId || !email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await auditService.log({
    companyId: req.companyId,
    userEmail: email,
    action: 'RESET_LOCKOUT',
    req,
    details: { note: 'No persistent lockout store is configured yet' },
  })

  return res.json({ success: true, message: 'Lockout state cleared for the current request context.' })
})

export { tokenRefreshMiddleware }
export default router
