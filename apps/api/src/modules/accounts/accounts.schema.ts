import { z } from 'zod'

// Query params for GET /api/accounts — pagination + filtering
export const accountsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing']).optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  search: z.string().trim().max(100).optional(),
  // Segment filter params — passed by frontend for server-side filtering
  mrr_gte: z.coerce.number().int().min(0).optional(), // e.g. 50000 for enterprise ($500+)
  health_score_lt: z.coerce.number().int().min(0).max(100).optional(), // e.g. 40 for at-risk
})

export type AccountsQuery = z.infer<typeof accountsQuerySchema>
