import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'
import { requireRole } from '../auth/rbac.middleware'

const router = express.Router()

interface CsvImportRow {
  name: string
  email: string
  plan?: string
  mrr_cents?: number
  status?: string
}

router.post('/import-csv', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { rows } = req.body as { rows: CsvImportRow[] }

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No valid CSV rows provided' })
  }

  try {
    let importedCount = 0
    let updatedCount = 0

    for (const r of rows) {
      if (!r.email || !r.name) continue

      const mrrCents = Number(r.mrr_cents) || 4900
      const plan = r.plan || 'starter'
      const status = r.status || 'active'

      const existing = await prisma.customer.findFirst({
        where: { company_id: companyId, email: r.email },
      })

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: r.name,
            plan,
            mrr_cents: mrrCents,
            status,
          },
        })
        updatedCount++
      } else {
        await prisma.customer.create({
          data: {
            company_id: companyId,
            email: r.email,
            name: r.name,
            plan,
            mrr_cents: mrrCents,
            status,
            billing_cycle: 'monthly',
          },
        })
        importedCount++
      }
    }

    // Invalidate KPI Cache
    kpiCache.set(`kpis_${companyId}`, null, 0)

    return res.json({
      success: true,
      message: `Successfully processed ${importedCount + updatedCount} rows (${importedCount} new, ${updatedCount} updated).`,
      importedCount,
      updatedCount,
    })
  } catch (err) {
    console.error('[csv-import] Error importing CSV:', err)
    return res.status(500).json({ error: 'Failed to import CSV dataset' })
  }
})

export default router
