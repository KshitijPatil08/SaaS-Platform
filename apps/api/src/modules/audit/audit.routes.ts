import express from 'express'
import { verifyJwt } from '../auth/auth.middleware'
import { auditService } from '../shared/lib/audit.service'

const router = express.Router()

// GET /api/audit-logs (protected) — returns security audit trail
router.get('/', verifyJwt, async (req, res) => {
  try {
    const companyId = req.companyId
    if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

    const logs = await auditService.getLogs(companyId, 50)
    return res.json(logs)
  } catch (error) {
    console.error('Audit logs fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

export default router
