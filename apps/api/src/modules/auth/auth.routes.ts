import { Router, Request, Response } from 'express'
import { authService } from './auth.service'
import { verifyJwt, tokenRefreshMiddleware } from './auth.middleware'
import { prisma } from '../shared/lib/prisma'

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
      res.cookie('access_token', result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      })
      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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

// POST /api/auth/invite (protected)
router.post('/invite', verifyJwt, async (req: Request, res: Response) => {
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
router.put('/team/:adminId/role', verifyJwt, async (req: Request, res: Response) => {
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
router.delete('/team/:adminId', verifyJwt, async (req: Request, res: Response) => {
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

export { tokenRefreshMiddleware }
export default router
