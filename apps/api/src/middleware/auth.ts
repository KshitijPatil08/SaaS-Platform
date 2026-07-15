import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me'

interface JwtPayload {
  companyId: string
  exp?: number
}

declare global {
  namespace Express {
    interface Request {
      companyId?: string
    }
  }
}

export const verifyJwt = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.companyId = decoded.companyId
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

export const tokenRefreshMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies?.access_token
  const refreshToken = req.cookies?.refresh_token

  // If already has valid access token, continue
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET) as JwtPayload
      req.companyId = decoded.companyId
      return next()
    } catch {
      // fall through to refresh logic
    }
  }

  // No valid access token but has refresh token
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload
      const newAccessToken = jwt.sign(
        { companyId: decoded.companyId },
        JWT_SECRET,
        { expiresIn: '15m' }
      )

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      })

      req.companyId = decoded.companyId
      return next()
    } catch {
      res.clearCookie('access_token')
      res.clearCookie('refresh_token')
      return res.status(401).json({ error: 'Session expired' })
    }
  }

  next()
}
