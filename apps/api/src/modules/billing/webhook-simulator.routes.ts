import express, { type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'
import { slackService } from '../notifications/slack-notifications.service'
import { requireRole } from '../auth/rbac.middleware'
import { validateBody } from '../shared/middleware/validation'

const router = express.Router()

const simulateSchema = z.object({
  // Fix: Strictly validate eventType against the allow-list — prevents arbitrary strings
  // being stored in the events table (event.name column) via this OWNER/ADMIN-only endpoint.
  eventType: z.enum(['subscription_created', 'payment_failed', 'subscription_deleted'], {
    errorMap: () => ({ message: 'eventType must be one of: subscription_created, payment_failed, subscription_deleted' }),
  }),
  customerEmail: z.string().email('customerEmail must be a valid email address'),
  // Cap mrrUsd to prevent wildly negative or astronomically large MRR values being injected
  mrrUsd: z.number().positive('mrrUsd must be positive').max(1_000_000, 'mrrUsd exceeds maximum').optional(),
})
router.post('/simulate', requireRole('OWNER', 'ADMIN'), validateBody(simulateSchema), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { eventType, customerEmail, mrrUsd } = req.body as z.infer<typeof simulateSchema>

  try {
    const mrrCents = Math.round((mrrUsd || 199) * 100)
    let customer = await prisma.customer.findFirst({
      where: { company_id: companyId, email: customerEmail },
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          company_id: companyId,
          email: customerEmail,
          name: customerEmail.split('@')[0],
          plan: 'pro',
          status: 'active',
          mrr_cents: mrrCents,
          billing_cycle: 'monthly',
        },
      })
    }

    let actionSummary = ''

    if (eventType === 'subscription_created') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'active', mrr_cents: mrrCents },
      })
      actionSummary = `Simulated new paid subscription (+$${mrrUsd || 199}/mo)`
      await slackService.notifyNewSubscription(companyId, customer.name, mrrUsd || 199)
    } else if (eventType === 'payment_failed') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'past_due' },
      })
      actionSummary = `Simulated payment failure (Account set to Past Due)`
    } else if (eventType === 'subscription_deleted') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'canceled', mrr_cents: 0 },
      })
      await prisma.churnEvent.create({
        data: {
          company_id: companyId,
          customer_id: customer.id,
          mrr_lost_cents: customer.mrr_cents || mrrCents,
          reason: 'Simulated Webhook Cancellation',
        },
      })
      actionSummary = `Simulated subscription cancellation (-$${(customer.mrr_cents / 100).toFixed(0)}/mo)`
      await slackService.notifyChurn(companyId, customer.name, customer.mrr_cents / 100, 'Simulated Cancellation')
    }

    // Record Event log
    await prisma.event.create({
      data: {
        company_id: companyId,
        customer_id: customer.id,
        name: eventType,
        properties: JSON.stringify({ simulated: true, mrr_cents: mrrCents }),
      },
    })

    // Invalidate Cache
    kpiCache.set(`kpis_${companyId}`, null, 0)

    return res.json({
      success: true,
      eventType,
      summary: actionSummary,
      timestamp: new Date().toISOString(),
      payload: {
        id: `evt_sim_${Date.now()}`,
        type: eventType,
        customer: customer.email,
        mrrCents,
      },
    })
  } catch (err) {
    console.error('[webhook-simulator] Error:', err)
    return res.status(500).json({ error: 'Failed to execute simulated webhook event' })
  }
})

export default router
