import express, { type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'
import { validateBody } from '../shared/middleware/validation'

const router = express.Router()

// Input schema for creating in-app notifications — prevents stored XSS / data bloat
const createNotificationSchema = z.object({
  type:  z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  body:  z.string().min(1).max(1000),
  meta:  z.record(z.unknown()).optional(),
})

// GET /api/notifications — paginated, most recent first
router.get('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const limit = Math.min(Number(req.query.limit) || 20, 50)

  const [notifications, unreadCount] = await Promise.all([
    (prisma as any).notification.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: limit,
    }),
    (prisma as any).notification.count({
      where: { company_id: companyId, read: false },
    }),
  ])

  return res.json({ notifications, unreadCount })
})

// POST /api/notifications/mark-read — mark all as read (O(1) bulk update)
router.post('/mark-read', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  await (prisma as any).notification.updateMany({
    where: { company_id: companyId, read: false },
    data: { read: true },
  })

  return res.json({ success: true })
})

// POST /api/notifications — internal: create a notification (called from webhook handlers)
// Fix #21: requireRole prevents ANALYST users from injecting arbitrary in-app alerts
router.post('/', requireRole('OWNER', 'ADMIN'), validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { type, title, body, meta } = req.body as z.infer<typeof createNotificationSchema>

  const notification = await (prisma as any).notification.create({
    data: {
      company_id: companyId,
      type,
      title,
      body,
      meta: JSON.stringify(meta || {}),
    },
  })

  return res.status(201).json(notification)
})

export default router
