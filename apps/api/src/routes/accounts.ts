import express from 'express'
import { verifyJwt } from '../middleware/auth'
import { validateQuery } from '../middleware/validation'
import { accountsQuerySchema } from '../middleware/validation'
import { prisma } from '../lib/prisma'

const router = express.Router()

// GET /api/accounts?page=1&pageSize=10&status=active&plan=pro&search=acme
// Returns paginated, filterable account list
router.get('/', verifyJwt, validateQuery(accountsQuerySchema), async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string) || 10)
    const status = req.query.status as string | undefined
    const plan = req.query.plan as string | undefined
    const search = req.query.search as string | undefined

    const where: Record<string, unknown> = { company_id: companyId }
    if (status) where.status = status
    if (plan) where.plan = plan
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [accounts, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

    return res.json({
      data: accounts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Accounts fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

export default router
