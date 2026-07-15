import express from 'express'
import { verifyJwt } from '../middleware/auth'
import { validateQuery, exportQuerySchema } from '../middleware/validation'
import { prisma } from '../lib/prisma'

const router = express.Router()

// GET /api/export?format=csv&range=last_12_months
// Returns CSV export of MRR snapshots for the company
router.get('/', verifyJwt, validateQuery(exportQuerySchema), async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const format = (req.query.format as string) || 'csv'
    const snapshots = await prisma.mRRSnapshot.findMany({
      where: { company_id: companyId },
      orderBy: { date: 'asc' },
      take: 12,
    })

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename="mrr-export.json"')
      return res.json(snapshots)
    }

    // Default: CSV
    const header = 'date,mrr_cents,new_mrr_cents,expansion_mrr_cents,contraction_mrr_cents,churned_mrr_cents,customer_count\n'
    const rows = snapshots
      .map(
        (s) =>
          `${s.date.toISOString().split('T')[0]},${s.mrr_cents},${s.new_mrr_cents},${s.expansion_mrr_cents},${s.contraction_mrr_cents},${s.churned_mrr_cents},${s.customer_count}`
      )
      .join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="mrr-export.csv"')
    return res.send(header + rows)
  } catch (error) {
    console.error('Export error:', error)
    return res.status(500).json({ error: 'Failed to export data' })
  }
})

export default router
