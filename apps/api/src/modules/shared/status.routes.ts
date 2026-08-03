import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

// Read version from package.json at module load — works regardless of how the process was started.
// This is more reliable than npm_package_version which is missing in Docker containers.
let APP_VERSION = '1.0.0'
try {
  const pkgPath = path.resolve(__dirname, '../../../../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string }
  APP_VERSION = pkg.version ?? '1.0.0'
} catch {
  // fallback: use npm_package_version if available (set by npm scripts)
  APP_VERSION = process.env.npm_package_version ?? '1.0.0'
}

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
    version: APP_VERSION,
  })
})

export default router
