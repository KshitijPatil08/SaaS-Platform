import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'

const router = express.Router()

// GET /api/saved-segments — list saved segment presets for this company
router.get('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const segments = await (prisma as any).savedSegment.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  })

  return res.json(segments)
})

// POST /api/saved-segments — create new saved segment preset
router.post('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { name, filters } = req.body

  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })
  if (!name || !filters) {
    return res.status(400).json({ error: 'name and filters are required' })
  }

  const segment = await (prisma as any).savedSegment.create({
    data: {
      company_id: companyId,
      name: name.trim(),
      filters: typeof filters === 'string' ? filters : JSON.stringify(filters),
    },
  })

  return res.status(201).json(segment)
})

// DELETE /api/saved-segments/:id — delete saved segment preset
router.delete('/:id', async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { id } = req.params

  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  await (prisma as any).savedSegment.deleteMany({
    where: { id, company_id: companyId },
  })

  return res.json({ success: true })
})

export default router
