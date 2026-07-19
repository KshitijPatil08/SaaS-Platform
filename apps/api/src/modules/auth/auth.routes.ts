import express, { Request, Response } from 'express';
import { tokenRefreshMiddleware } from './auth.middleware';
import { authService, cookieOptions } from './auth.service';
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
    return res.status(401).json({ error: 'Invalid credentials', mfaRequired: result.mfaRequired });
  }

  setAuthCookies(res, result.tokens!);
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
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
});

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
    return res.status(201).json(result);
  } catch (e) {
    return res.status(409).json({ error: (e as Error).message });
  }
});

// Re-export so app.ts can mount tokenRefreshMiddleware at the app level
export { tokenRefreshMiddleware };
export default router;
