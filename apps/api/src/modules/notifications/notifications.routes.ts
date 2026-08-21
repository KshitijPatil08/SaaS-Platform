import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'

const router = express.Router()

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
router.post('/', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { type, title, body, meta } = req.body
  if (!type || !title || !body) {
    return res.status(400).json({ error: 'type, title, and body are required' })
  }

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
