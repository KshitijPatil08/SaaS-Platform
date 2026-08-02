import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../shared/lib/config'

const JWT_SECRET = config.jwtSecret
const JWT_REFRESH_SECRET = config.jwtRefreshSecret

interface JwtPayload {
  companyId: string
  adminEmail?: string
  exp?: number
}

declare global {
  namespace Express {
    interface Request {
      companyId?: string
      adminEmail?: string
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
    req.adminEmail = decoded.adminEmail
    next()
  } catch (error) {
    res.clearCookie('access_token')
    res.clearCookie('refresh_token')
    return res.status(401).json({ error: 'Invalid or expired token' })
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
      req.adminEmail = decoded.adminEmail
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
        { companyId: decoded.companyId, adminEmail: decoded.adminEmail },
        JWT_SECRET,
        { expiresIn: '15m' }
      )

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      })

      req.companyId = decoded.companyId
      req.adminEmail = decoded.adminEmail
      return next()
    } catch {
      // Stale/invalid refresh token: clear it and continue.
      res.clearCookie('access_token')
      res.clearCookie('refresh_token')
      return next()
    }
  }

  next()
}
