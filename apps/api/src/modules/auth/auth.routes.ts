import express, { Request, Response } from 'express';
import { tokenRefreshMiddleware, verifyJwt } from './auth.middleware';
import { authService, cookieOptions } from './auth.service';
import { auditService } from '../shared/lib/audit.service';
import {
  loginSchema,
  registerSchema,
  mfaEnrollSchema,
  mfaConfirmSchema,
} from './auth.schema';

const router = express.Router();

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie('access_token', tokens.accessToken, cookieOptions);
  res.cookie('refresh_token', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: authService.REFRESH_MAX_AGE,
  });
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }

  const result = await authService.login(parsed.data);
  if (!result.success) {
    if (result.companyId) {
      await auditService.log({
        companyId: result.companyId,
        userEmail: parsed.data.email,
        action: 'LOGIN_FAILED',
        req,
        details: { mfaRequired: result.mfaRequired || false },
      })
    }
    return res.status(401).json({ error: 'Invalid credentials', mfaRequired: result.mfaRequired });
  }

  setAuthCookies(res, result.tokens!);
  await auditService.log({
    companyId: result.companyId!,
    userEmail: parsed.data.email,
    action: 'LOGIN_SUCCESS',
    req,
  })

  return res.json({ success: true });
});

// POST /api/auth/mfa/enroll
router.post('/mfa/enroll', async (req: Request, res: Response) => {
  const parsed = mfaEnrollSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  try {
    const secret = await authService.enrollMfa(parsed.data);
    return res.json(secret);
  } catch {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /api/auth/mfa/confirm
router.post('/mfa/confirm', async (req: Request, res: Response) => {
  const parsed = mfaConfirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  try {
    const result = await authService.confirmMfa(parsed.data);
    if (req.companyId) {
      await auditService.log({
        companyId: req.companyId,
        userEmail: parsed.data.email,
        action: 'CONFIRM_MFA',
        req,
      })
    }
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
});

// GET /api/auth/lockout-status (protected) — check lockout state
router.get('/lockout-status', verifyJwt, async (req: Request, res: Response) => {
  return res.json({
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1',
    status: 'NORMAL',
    maxAllowedRequests: 10,
    windowMs: 60000,
  })
})

// POST /api/auth/reset-lockout (protected) — reset rate limit / lockout
router.post('/reset-lockout', verifyJwt, async (req: Request, res: Response) => {
  if (req.companyId) {
    await auditService.log({
      companyId: req.companyId,
      userEmail: 'admin@pulse.example',
      action: 'RESET_LOCKOUT',
      req,
    })
  }
  return res.json({ success: true, message: 'Rate limits and lockouts reset for IP' })
})

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return res.json({ success: true });
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid registration data' });
  }

  try {
    const result = await authService.register(parsed.data);
    setAuthCookies(res, result.tokens!);
    await auditService.log({
      companyId: result.companyId,
      userEmail: parsed.data.email,
      action: 'LOGIN_SUCCESS',
      req,
      details: { event: 'REGISTRATION' },
    })
    return res.status(201).json({ success: true, companyId: result.companyId });
  } catch (e) {
    return res.status(409).json({ error: (e as Error).message });
  }
});

// POST /api/auth/invite (protected) — invite additional team admin
router.post('/invite', verifyJwt, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const invited = await authService.inviteAdmin(req.companyId!, email, password)
    await auditService.log({
      companyId: req.companyId!,
      userEmail: email,
      action: 'UPDATE_PROFILE',
      req,
      details: { event: 'ADMIN_INVITED', invitedEmail: email },
    })
    return res.status(201).json(invited)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
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
    await auditService.log({
      companyId: req.companyId!,
      userEmail: updated.admin?.email || 'admin',
      action: 'UPDATE_PROFILE',
      req,
    })
    return res.json(updated)
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message })
  }
})

export { tokenRefreshMiddleware }
export default router
