import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'

const router = express.Router()

const startTime = Date.now()

// GET /api/status — PUBLIC endpoint, no auth required
router.get('/', async (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)
  const checks: Record<string, { status: 'operational' | 'degraded' | 'down'; latencyMs?: number }> = {}

  // Database health check — simple ping query
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'operational', latencyMs: Date.now() - dbStart }
  } catch {
    checks.database = { status: 'down' }
  }

  // API health
  checks.api = { status: 'operational', latencyMs: 0 }

  const allOperational = Object.values(checks).every(c => c.status === 'operational')

  return res.json({
    status: allOperational ? 'operational' : 'degraded',
    uptimeSeconds,
    checks,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  })
})

export default router
