import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { auditService } from '../shared/lib/audit.service'

const router = express.Router()

// GET /api/audit-logs?page=1&pageSize=20 (protected) — returns paginated security audit trail
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10))
    const pageSize = Math.min(100, parseInt(String(req.query.pageSize || '20'), 10))

    const result = await auditService.getLogs(companyId, pageSize, page)
    return res.json(result)
  } catch (error) {
    console.error('Audit logs fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

export default router
