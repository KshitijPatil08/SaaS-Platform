import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { kpiCache } from '../shared/lib/kpi-cache'
import { slackService } from '../notifications/slack-notifications.service'
import { requireRole } from '../auth/rbac.middleware'

const router = express.Router()

// Fix #22: requireRole — only OWNER/ADMIN may fire simulated webhook events.
// Without this, an ANALYST could flood churn metrics and trigger Slack alert storms.
router.post('/simulate', requireRole('OWNER', 'ADMIN'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { eventType, customerEmail, mrrUsd } = req.body as {
    eventType: 'subscription_created' | 'payment_failed' | 'subscription_deleted'
    customerEmail: string
    mrrUsd?: number
  }

  if (!eventType || !customerEmail) {
    return res.status(400).json({ error: 'eventType and customerEmail are required' })
  }

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
