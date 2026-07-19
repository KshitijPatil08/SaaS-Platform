import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { validateQuery } from '../shared/middleware/validation'
import { prisma } from '../shared/lib/prisma'
import { exportQuerySchema, CSV_HEADER, toCsvRow } from './export.schema'

const router = express.Router()

// GET /api/export?format=csv&range=last_12_months
// Returns CSV/JSON export of MRR snapshots for the company
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

    const rows = snapshots.map(toCsvRow).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="mrr-export.csv"')
    return res.send(CSV_HEADER + '\n' + rows)
  } catch (error) {
    console.error('Export error:', error)
    return res.status(500).json({ error: 'Failed to export data' })
  }
})

export default router
