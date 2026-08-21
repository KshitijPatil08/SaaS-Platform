import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'

const router = express.Router()

// GET /api/customer-notes/:customerId — all notes for a customer (newest first)
router.get('/:customerId', async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { customerId } = req.params
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  // Verify customer belongs to this company
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, company_id: companyId },
    select: { id: true },
  })
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  const notes = await (prisma as any).customerNote.findMany({
    where: { customer_id: customerId, company_id: companyId },
    orderBy: { created_at: 'desc' },
    take: 50,
  })

  return res.json(notes)
})

// POST /api/customer-notes/:customerId — create a note
router.post('/:customerId', async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { customerId } = req.params
  const { body } = req.body as { body: string }

  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })
  if (!body || body.trim().length === 0) {
    return res.status(400).json({ error: 'Note body cannot be empty' })
  }
  // Fix #18: Cap note body length — prevents DB bloat and massive timeline payloads
  if (body.trim().length > 5000) {
    return res.status(400).json({ error: 'Note body must be 5,000 characters or less' })
  }

  // Verify customer belongs to this company
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, company_id: companyId },
    select: { id: true },
  })
  if (!customer) return res.status(404).json({ error: 'Customer not found' })

  const note = await (prisma as any).customerNote.create({
    data: {
      company_id: companyId,
      customer_id: customerId,
      author: req.adminEmail || 'admin',
      body: body.trim(),
    },
  })

  return res.status(201).json(note)
})

// DELETE /api/customer-notes/:customerId/:noteId — delete a specific note
router.delete('/:customerId/:noteId', async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { customerId, noteId } = req.params
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  await (prisma as any).customerNote.deleteMany({
    where: { id: noteId, customer_id: customerId, company_id: companyId },
  })

  return res.json({ success: true })
})

export default router
