import { z } from 'zod'

// Query params for GET /api/accounts — pagination + filtering
export const accountsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing']).optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  search: z.string().trim().max(100).optional(),
})

export type AccountsQuery = z.infer<typeof accountsQuerySchema>
