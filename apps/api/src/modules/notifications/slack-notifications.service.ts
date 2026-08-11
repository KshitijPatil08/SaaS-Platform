import express, { type Request, type Response } from 'express'
import { prisma } from '../shared/lib/prisma'
import { requireRole } from '../auth/rbac.middleware'

export const slackService = {
  /**
   * Dispatches a Slack webhook notification — fire-and-forget.
   * We intentionally do NOT await the fetch so callers on the Stripe webhook
   * thread return immediately. Slack latency (200–2000ms) must never block
   * the Express response back to Stripe (which retries on timeout).
   */
  sendSlackAlert(webhookUrl: string, message: { text: string; blocks?: any[] }): void {
    // SECURITY: Parse and validate the URL, then reconstruct it from a hardcoded
    // host constant so that no attacker-controlled string ever flows directly
    // into fetch(). This prevents SSRF regardless of what the DB field contains.
    const SLACK_HOST = 'https://hooks.slack.com'
    let parsedUrl: URL
    try {
      parsedUrl = new URL(webhookUrl)
    } catch {
      return // Reject malformed URLs
    }
    // Reject anything that isn't a real Slack Incoming Webhook endpoint
    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'hooks.slack.com') return

    // Reconstruct from trusted host + validated path — the user-supplied string
    // is never used directly in the fetch call.
    const safeUrl = `${SLACK_HOST}${parsedUrl.pathname}`

    // Fire-and-forget: enqueue the HTTP request but do not block the caller
    fetch(safeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch((err: unknown) => {
      console.error('[slack-service] Error posting to Slack webhook:', (err as Error).message)
    })
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
  if (!slackWebhookUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid Slack Webhook URL format' })
  }

  // Dispatch is fire-and-forget — we return success immediately
  slackService.sendSlackAlert(slackWebhookUrl, {
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

  return res.json({ success: true, message: 'Test message dispatched to Slack (fire-and-forget).' })
})

export default router
