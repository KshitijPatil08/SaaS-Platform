import { Router, Request, Response } from 'express'
import { authService } from './auth.service'
import { verifyJwt, tokenRefreshMiddleware } from './auth.middleware'
import { requireRole } from './rbac.middleware'
import { prisma } from '../shared/lib/prisma'
import { config } from '../shared/lib/config'
import { auditService } from '../shared/lib/audit.service'

const router = Router()

// POST /api/auth/register (public)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { companyName, email, password } = req.body
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'companyName, email, and password are required' })
    }
    const result = await authService.register({ companyName, email, password })
    return res.status(201).json(result)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// POST /api/auth/login (public)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, mfaToken } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    const result = await authService.login({ email, password, mfaToken })
    if (result.tokens) {
      const isProduction = process.env.NODE_ENV === 'production'
      // SameSite:'none' is required for cross-origin requests (Vercel → Railway).
      // SameSite:'lax' silently drops cookies on cross-site POST requests.
      // SameSite:'none' must be paired with Secure:true (HTTPS only).
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
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' })
    }
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
router.post('/invite', verifyJwt, requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    const result = await authService.inviteAdmin(req.companyId!, email, password, role)
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

// PUT /api/auth/team/:adminId/role (protected)
router.put('/team/:adminId/role', verifyJwt, requireRole('OWNER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { adminId } = req.params
  const { role } = req.body as { role: string }

  if (!companyId || !adminId || !role) {
    return res.status(400).json({ error: 'adminId and role are required' })
  }

  try {
    await (prisma as any).adminUser.updateMany({
      where: { id: adminId, company_id: companyId },
      data: { role },
    })

    return res.json({ success: true, message: `Team admin role updated to ${role}` })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update team admin role' })
  }
})

// DELETE /api/auth/team/:adminId (protected)
router.delete('/team/:adminId', verifyJwt, requireRole('OWNER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { adminId } = req.params

  if (!companyId || !adminId) {
    return res.status(400).json({ error: 'adminId is required' })
  }

  try {
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
router.put('/profile', verifyJwt, async (req: Request, res: Response) => {
  try {
    const updated = await authService.updateProfile(req.companyId!, req.body)
    return res.json(updated)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
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
