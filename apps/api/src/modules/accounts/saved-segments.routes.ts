import express, { type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../shared/lib/prisma'

const router = express.Router()

const savedSegmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  filters: z.record(z.any()).or(z.string().max(2000)),
})

// GET /api/saved-segments — list saved segment presets for this company
router.get('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const segments = await (prisma as any).savedSegment.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
    take: 50, // Hard cap — prevent unbounded query
  })

  return res.json(segments)
})

// POST /api/saved-segments — create new saved segment preset
router.post('/', async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const parsed = savedSegmentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    })
  }

  const { name, filters } = parsed.data

  // Prevent duplicate segment names per company
  const existing = await (prisma as any).savedSegment.findFirst({
    where: { company_id: companyId, name: name.trim() },
    select: { id: true },
  })
  if (existing) {
    return res.status(409).json({ error: `A segment named "${name.trim()}" already exists` })
  }

  // Cap at 20 custom segments per company
  const count = await (prisma as any).savedSegment.count({ where: { company_id: companyId } })
  if (count >= 20) {
    return res.status(400).json({ error: 'Maximum of 20 saved segments reached. Delete one first.' })
  }

  const segment = await (prisma as any).savedSegment.create({
    data: {
      company_id: companyId,
      name: name.trim(),
      // Normalize: always store as a JSON string
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

  // deleteMany is safe: no error if segment doesn't exist or belongs to another company
  await (prisma as any).savedSegment.deleteMany({
    where: { id, company_id: companyId },
  })

  return res.json({ success: true })
})

export default router
