import { z } from 'zod'

// Query params for GET /api/export
export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  range: z.enum(['last_3_months', 'last_6_months', 'last_12_months', 'all_time']).optional().default('last_12_months'),
})

export type ExportQuery = z.infer<typeof exportQuerySchema>

export const CSV_HEADER =
  'date,mrr_cents,new_mrr_cents,expansion_mrr_cents,contraction_mrr_cents,churned_mrr_cents,customer_count'

// Render a single MRR snapshot row as a CSV line
export function toCsvRow(s: {
  date: Date
  mrr_cents: number
  new_mrr_cents: number
  expansion_mrr_cents: number
  contraction_mrr_cents: number
  churned_mrr_cents: number
  customer_count: number
}): string {
  return [
    s.date.toISOString().split('T')[0],
    s.mrr_cents,
    s.new_mrr_cents,
    s.expansion_mrr_cents,
    s.contraction_mrr_cents,
    s.churned_mrr_cents,
    s.customer_count,
  ].join(',')
}
