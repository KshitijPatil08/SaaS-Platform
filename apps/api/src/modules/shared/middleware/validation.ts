import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Reusable schema definitions
export const accountsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing']).optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  search: z.string().trim().max(100).optional(),
})

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  range: z.string().max(50).optional(),
})

export const dateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
})

type SchemaMap = Record<string, z.ZodTypeAny>

export function validateQuery(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.flatten(),
      })
    }
    req.query = result.data as unknown as Request['query']
    next()
  }
}

// Example of how to use across routes:
// router.get('/', verifyJwt, validateQuery(accountsQuerySchema), handler)
export const schemas: SchemaMap = {
  accountsQuery: accountsQuerySchema,
  exportQuery: exportQuerySchema,
  dateRange: dateRangeSchema,
}
