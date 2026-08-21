import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

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

/**
 * Validates req.body against a Zod schema.
 * Returns 400 with structured error details on failure.
 * Replaces the validated data on req.body so controllers receive clean types.
 */
export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: result.error.flatten(),
      })
    }
    req.body = result.data
    next()
  }
}
