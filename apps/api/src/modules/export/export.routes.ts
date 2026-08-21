import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { validateQuery } from '../shared/middleware/validation'
import { prisma } from '../shared/lib/prisma'
import { auditService } from '../shared/lib/audit.service'
import { exportQuerySchema, CSV_HEADER, toCsvRow } from './export.schema'

const router = express.Router()

/**
 * Sanitize a field for safe CSV output.
 * Prevents: CSV row injection via \n\r, Excel formula injection via = @ + -
 * RFC-4180 compliant double-quote escaping.
 */
function csvField(value: string | null | undefined): string {
  const s = String(value ?? '').replace(/[\r\n]/g, ' ').replace(/"/g, '""')
  return `"${s}"`
}

// GET /api/export?format=csv&range=last_12_months&type=mrr|customers|churn
router.get('/', verifyJwt, validateQuery(exportQuerySchema), async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const format = (req.query.format as string) || 'csv'
    const range = (req.query.range as string) || 'last_12_months'
    const type = (req.query.type as string) || 'mrr'

    const rangeTakeMap: Record<string, number | undefined> = {
      last_3_months: 3,
      last_6_months: 6,
      last_12_months: 12,
      all_time: undefined,
    }
    const take = rangeTakeMap[range] ?? 12

    await auditService.log({
      companyId,
      userEmail: req.adminEmail || 'admin@pulse.example',
      action: 'EXPORT_DATA',
      req,
      details: { format, range, type },
    })

    // Customers export
    if (type === 'customers') {
      // Fix #13: Hard cap at 10,000 rows — prevents full-table dump and memory exhaustion.
      // Consumers needing more data should use pagination or chunked exports.
      const customers = await prisma.customer.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: 10_000,
      })

      if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="customers-export.json"')
        return res.json(customers)
      }

      const csv = [
        'Name,Email,Plan,Status,MRR (USD),Billing Cycle,Created At',
        ...customers.map(c => [
          csvField(c.name),
          csvField(c.email),
          csvField(c.plan),
          csvField(c.status),
          (c.mrr_cents / 100).toFixed(2),
          csvField(c.billing_cycle),
          new Date(c.created_at).toISOString().split('T')[0],
        ].join(',')),
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"')
      return res.send(csv)
    }

    // Churn export
    if (type === 'churn') {
      const churnEvents = await prisma.churnEvent.findMany({
        where: { company_id: companyId },
        include: { customer: { select: { name: true, email: true } } },
        orderBy: { churned_at: 'desc' },
        take: 10_000, // Fix #13: Hard cap to prevent unbounded query
      })

      if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="churn-export.json"')
        return res.json(churnEvents)
      }

      const csv = [
        'Customer Name,Email,Reason,MRR Lost (USD),Churned At',
        ...churnEvents.map(e => [
          csvField(e.customer?.name),
          csvField(e.customer?.email),
          csvField(e.reason),
          (e.mrr_lost_cents / 100).toFixed(2),
          new Date(e.churned_at).toISOString().split('T')[0],
        ].join(',')),
      ].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="churn-export.csv"')
      return res.send(csv)
    }

    // Default: MRR snapshot export
    const snapshots = await prisma.mRRSnapshot.findMany({
      where: { company_id: companyId },
      orderBy: { date: 'asc' },
      ...(take ? { take } : {}),
    })

    if (format === 'json') {
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

