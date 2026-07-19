import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { validateQuery } from '../shared/middleware/validation'
import { accountsQuerySchema } from './accounts.schema'
import { accountsService } from './accounts.service'

const router = express.Router()

// GET /api/accounts?page=1&pageSize=10&status=active&plan=pro&search=acme
// Returns paginated, filterable account list
router.get('/', verifyJwt, validateQuery(accountsQuerySchema), async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await accountsService.list(req.query as any, companyId)
    return res.json(result)
  } catch (error) {
    console.error('Accounts fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

export default router
