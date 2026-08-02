import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'

export const slackService = {
  async sendSlackAlert(webhookUrl: string, message: { text: string; blocks?: any[] }) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) return false

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
      return response.ok
    } catch (err) {
      console.error('[slack-service] Error posting to Slack webhook:', err)
      return false
    }
  },

  async notifyNewSubscription(companyId: string, customerName: string, mrrUsd: number) {
    const company: any = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slack_webhook_url: true, name: true } as any,
    })

    if (!company?.slack_webhook_url) return

    const payload = {
      text: `🎉 *New Paid Subscription Acquired!*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎉 *New Paid Subscription Acquired!*\n*Account:* ${customerName}\n*New MRR:* +$${mrrUsd}/mo`,
          },
        },
      ],
    }

    await this.sendSlackAlert(company.slack_webhook_url, payload)
  },

  async notifyChurn(companyId: string, customerName: string, lostMrrUsd: number, reason: string) {
    const company: any = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slack_webhook_url: true } as any,
    })

    if (!company?.slack_webhook_url) return

    const payload = {
      text: `⚠️ *Customer Churn Alert*`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *Customer Churn Alert*\n*Account:* ${customerName}\n*Lost MRR:* -$${lostMrrUsd}/mo\n*Reason:* ${reason}`,
          },
        },
      ],
    }

    await this.sendSlackAlert(company.slack_webhook_url, payload)
  },
}

// ─── Notification Config API Router ──────────────────────────────────────────

const router = express.Router()

router.get('/settings', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const company: any = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slack_webhook_url: true, alert_email: true } as any,
    })

    return res.json(company)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notification settings' })
  }
})

router.put('/settings', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  if (!companyId) return res.status(401).json({ error: 'Unauthorized' })

  const { slackWebhookUrl, alertEmail } = req.body as { slackWebhookUrl?: string; alertEmail?: string }

  try {
    const updated: any = await prisma.company.update({
      where: { id: companyId },
      data: {
        slack_webhook_url: slackWebhookUrl || null,
        alert_email: alertEmail || null,
      } as any,
      select: { slack_webhook_url: true, alert_email: true } as any,
    })

    return res.json({ success: true, settings: updated })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification settings' })
  }
})

router.post('/test-slack', requireRole('OWNER', 'ADMIN', 'DEVELOPER'), async (req: Request, res: Response) => {
  const companyId = req.companyId
  const { slackWebhookUrl } = req.body as { slackWebhookUrl: string }

  if (!slackWebhookUrl) return res.status(400).json({ error: 'Slack Webhook URL is required' })

  const ok = await slackService.sendSlackAlert(slackWebhookUrl, {
    text: `⚡ *Pulse SaaS Analytics Test Notification*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚡ *Pulse SaaS Analytics Integration Test*\nSlack webhook integration is configured and active!`,
        },
      },
    ],
  })

  if (ok) return res.json({ success: true, message: 'Test message sent to Slack!' })
  return res.status(400).json({ error: 'Failed to deliver test message to Slack webhook URL' })
})

export default router
