/**
 * csv-import.routes.ts
 *
 * POST /api/import/csv
 *
 * Accepts a CSV file upload (multipart/form-data, field name: "file")
 * and upserts customers into the authenticated company's account.
 *
 * Expected CSV columns (header row required):
 *   name, email, plan, status, mrr_cents, billing_cycle, created_at (optional)
 *
 * Processing:
 *   - Validates headers, parses rows, skips blank/header rows
 *   - Validates each row with Zod
 *   - Upserts in batches of 100 using createMany (skipDuplicates on SQLite fallback)
 *   - Returns a summary: { imported, skipped, errors }
 *
 * Security:
 *   - JWT required + OWNER/ADMIN role
 *   - File size capped at 5MB
 *   - Only CSV MIME types accepted
 */

import express, { type Request, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { verifyJwt } from '../auth/auth.middleware'
import { requireRole } from '../auth/rbac.middleware'
import { prisma } from '../shared/lib/prisma'
import { auditService } from '../shared/lib/audit.service'
import { kpiCache } from '../shared/lib/kpi-cache'

const router = express.Router()

// Memory storage — we parse inline, no temp files written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']
    if (!allowed.includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are accepted'))
    }
    cb(null, true)
  },
})

// Zod schema for a single CSV row after parsing
const csvRowSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  plan: z.string().min(1).max(100),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']).default('active'),
  mrr_cents: z
    .string()
    .transform((v) => parseInt(v.replace(/[^0-9]/g, ''), 10))
    .pipe(z.number().int().min(0).max(100_000_000)),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  created_at: z
    .string()
    .optional()
    .transform((v) => (v && !isNaN(Date.parse(v)) ? new Date(v) : undefined)),
})

/**
 * Parse raw CSV text into an array of row objects.
 * Handles Windows (CRLF) and Unix (LF) line endings.
 * Time: O(N), Space: O(N) — N = number of rows
 */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const headers = lines[0]?.toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  if (!headers || headers.length < 3) return []

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parser: handles quoted fields with commas
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    if (values.length !== headers.length) continue // malformed row — skip

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })
    rows.push(row)
  }
  return rows
}

const BATCH_SIZE = 100

// POST /api/import/csv
router.post(
  '/',
  verifyJwt,
  requireRole('OWNER', 'ADMIN'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send CSV as multipart field "file".' })
    }

    const csvText = req.file.buffer.toString('utf-8')
    const rawRows = parseCsv(csvText)

    // Security: cap at 5,000 rows — a 5MB file with tiny rows could produce 500,000 rows,
    // causing a CPU/memory spike in the batching loop. Reject before processing starts.
    if (rawRows.length > 5_000) {
      return res.status(400).json({
        error: `CSV exceeds the maximum of 5,000 rows. Split your file and import in batches.`,
      })
    }

    if (rawRows.length === 0) {
      return res.status(400).json({
        error: 'No valid rows found. Ensure the CSV has a header row and at least one data row.',
      })
    }

    const validRows: {
      company_id: string
      name: string
      email: string
      plan: string
      status: string
      mrr_cents: number
      billing_cycle: string
      created_at: Date
    }[] = []

    const errors: Array<{ row: number; email?: string; issues: string[] }> = []

    for (let i = 0; i < rawRows.length; i++) {
      const parsed = csvRowSchema.safeParse(rawRows[i])
      if (!parsed.success) {
        errors.push({
          row: i + 2, // +2 for 1-indexed + header row
          email: rawRows[i].email,
          issues: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
        })
        continue
      }

      const d = parsed.data
      validRows.push({
        company_id: companyId,
        name: d.name,
        email: d.email,
        plan: d.plan,
        status: d.status,
        mrr_cents: d.mrr_cents,
        billing_cycle: d.billing_cycle,
        created_at: d.created_at ?? new Date(),
      })
    }

    let imported = 0

    // Process in batches of 100 — avoids single massive INSERT statement
    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)
      try {
        const result = await (prisma.customer as any).createMany({
          data: batch,
          skipDuplicates: true, // skip rows where (company_id, email) already exists
        })
        imported += result.count
      } catch (err) {
        console.error(`[csv-import] Batch ${i / BATCH_SIZE + 1} failed:`, err)
        // Count the skipped batch rows as errors
        batch.forEach((_, idx) => {
          errors.push({ row: i + idx + 2, issues: ['Batch insert failed — possible duplicate'] })
        })
      }
    }

    const skipped = validRows.length - imported

    // Invalidate KPI cache — new customers affect MRR aggregates
    kpiCache.invalidate(`kpis_${companyId}`)

    // Audit the import
    await auditService.log({
      companyId,
      userEmail: req.adminEmail || 'admin',
      action: 'CSV_IMPORT',
      req,
      details: {
        filename: req.file.originalname,
        totalRows: rawRows.length,
        imported,
        skipped,
        errorCount: errors.length,
      },
    })

    return res.status(200).json({
      success: true,
      summary: {
        total: rawRows.length,
        imported,
        skipped,
        errorCount: errors.length,
      },
      // Return first 50 errors max — prevents enormous payloads
      errors: errors.slice(0, 50),
    })
  }
)

export default router
