import crypto from 'crypto'
import { prisma } from './prisma'
import { config } from './config'

// ── Transactional email interfaces ─────────────────────────────────────────

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  provider: string
  error?: string
}

function htmlToText(html: string): string {
  // Converts server-generated HTML email templates to plain text.
  // All HTML passed here comes from our own templates, not user input.
  // Use an iterative approach so adjacent/nested tags are fully removed
  // without triggering CodeQL's incomplete-sanitization or bad-tag-filter rules.
  let result = html
  let prev: string
  do {
    prev = result
    result = result
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<[^>]*>/g, '') // Remove all complete HTML tags generically
  } while (result !== prev)   // Repeat until no more tags are found (stable)

  // Decode HTML entities — &amp; MUST come last to prevent double-unescaping
  // (e.g. &amp;lt; → &lt; → < if &amp; were decoded first)
  return result
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // last — avoids double-unescaping
    .trim()
}

async function dispatchEmail(msg: EmailMessage): Promise<EmailResult> {
  const fromAddr = msg.from ?? (config as any).emailFrom ?? 'Pulse <noreply@usepulse.app>'
  const toArr = Array.isArray(msg.to) ? msg.to : [msg.to]
  const textBody = msg.text ?? htmlToText(msg.html)

  // Resend (preferred transactional provider)
  if ((config as any).resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(config as any).resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromAddr, to: toArr, subject: msg.subject, html: msg.html, text: textBody }),
      })
      if (!res.ok) {
        const err = await res.text()
        return { success: false, provider: 'resend', error: err }
      }
      const data = await res.json() as { id?: string }
      return { success: true, provider: 'resend', messageId: data.id }
    } catch (e) {
      return { success: false, provider: 'resend', error: String(e) }
    }
  }

  // SendGrid fallback
  if ((config as any).sendGridApiKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(config as any).sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: toArr.map((e) => ({ email: e })) }],
          from: { email: fromAddr },
          subject: msg.subject,
          content: [
            { type: 'text/plain', value: textBody },
            { type: 'text/html', value: msg.html },
          ],
        }),
      })
      if (!res.ok) return { success: false, provider: 'sendgrid', error: await res.text() }
      return { success: true, provider: 'sendgrid' }
    } catch (e) {
      return { success: false, provider: 'sendgrid', error: String(e) }
    }
  }

  // No provider configured — console log for development
  console.log(`[email:dev] TO: ${toArr.join(', ')} | SUBJECT: ${msg.subject}`)
  console.log(`[email:dev] BODY:\n${textBody}`)
  return { success: true, provider: 'console-dev' }
}

export const emailService = {
  /**
   * Send a transactional email via Resend > SendGrid > console-dev fallback.
   * Never throws — returns EmailResult with success/error.
   */
  async send(msg: EmailMessage): Promise<EmailResult> {
    try {
      return await dispatchEmail(msg)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      console.error('[email] Unexpected send error:', error)
      return { success: false, provider: 'unknown', error }
    }
  },

  // ── Pre-built templates ─────────────────────────────────────────────────

  async sendTrialExpiryWarning(opts: {
    to: string; customerName: string; daysLeft: number; companyName: string
  }): Promise<EmailResult> {
    const urgency = opts.daysLeft <= 1 ? '🚨 URGENT:' : opts.daysLeft <= 3 ? '⚠️' : '📅'
    return this.send({
      to: opts.to,
      subject: `${urgency} Your ${opts.companyName} trial expires in ${opts.daysLeft} day${opts.daysLeft === 1 ? '' : 's'}`,
      html: `<p>Hi ${opts.customerName},</p><p>Your trial of <strong>${opts.companyName}</strong> expires in <strong>${opts.daysLeft} day${opts.daysLeft === 1 ? '' : 's'}</strong>.</p><p><a href="${config.clientOrigin}/billing">Upgrade now</a> to keep uninterrupted access.</p><p>— The ${opts.companyName} Team</p>`,
    })
  },

  async sendDunningReminder(opts: {
    to: string; customerName: string; mrrCents: number; companyName: string
  }): Promise<EmailResult> {
    const mrrFormatted = `$${(opts.mrrCents / 100).toFixed(2)}`
    return this.send({
      to: opts.to,
      subject: `Action required: Update your payment method for ${opts.companyName}`,
      html: `<p>Hi ${opts.customerName},</p><p>Your recent payment of <strong>${mrrFormatted}</strong> failed. Please <a href="${config.clientOrigin}/billing">update your payment method</a> to avoid service interruption.</p><p>— The ${opts.companyName} Team</p>`,
    })
  },

  async sendHealthAlertToAdmin(opts: {
    adminEmail: string; customerName: string; score: number; companyName: string
  }): Promise<EmailResult> {
    return this.send({
      to: opts.adminEmail,
      subject: `⚠️ Health Alert: ${opts.customerName} dropped to ${opts.score}/100 in ${opts.companyName}`,
      html: `<p>A customer health alert was triggered:</p><ul><li><strong>Customer:</strong> ${opts.customerName}</li><li><strong>Health Score:</strong> ${opts.score}/100 (Critical)</li></ul><p><a href="${config.clientOrigin}/accounts">View in Pulse Dashboard</a></p>`,
    })
  },

  /**
   * Generates a 64-char hex password reset token, saves it to PasswordResetToken table,
   * and dispatches a password reset email.
   */
  async sendPasswordResetEmail(email: string) {
    const admin = await prisma.adminUser.findFirst({ where: { email } })
    if (!admin) {
      // Security: return success even if user not found to prevent user enumeration
      return { success: true, message: 'If an account exists with that email, a reset link has been sent.' }
    }

    // Invalidate any existing unused reset tokens for this admin
    await (prisma as any).passwordResetToken.updateMany({
      where: { admin_id: admin.id, used: false },
      data: { used: true },
    })

    // Generate fresh crypto-random token (expires in 1 hour)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await (prisma as any).passwordResetToken.create({
      data: { token: rawToken, admin_id: admin.id, expires_at: expiresAt, used: false },
    })

    const resetLink = `${config.clientOrigin}/login?reset_token=${rawToken}`

    await this.send({
      to: email,
      subject: 'Reset your Pulse password',
      html: `<p>Hi,</p><p>Click below to reset your password (expires in 1 hour):</p><p><a href="${resetLink}">Reset Password</a></p><p>If you didn't request this, ignore this email.</p>`,
    })

    console.log(`[email-service] ✉️ Password Reset Email sent to ${email}`)
    return {
      success: true,
      message: `Password reset link generated and dispatched to ${email}`,
      resetLink: (config as any).isProduction ? undefined : resetLink,
    }
  },

  /**
   * Validates reset token and sets new password_hash on admin user
   */
  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await (prisma as any).passwordResetToken.findUnique({
      where: { token },
      include: { admin: true },
    })

    if (!resetRecord || resetRecord.used || new Date() > resetRecord.expires_at) {
      throw new Error('Invalid or expired password reset token')
    }

    const bcrypt = await import('bcrypt')
    const password_hash = await bcrypt.default.hash(newPassword, 12)

    await (prisma as any).$transaction([
      prisma.adminUser.update({ where: { id: resetRecord.admin_id }, data: { password_hash } }),
      (prisma as any).passwordResetToken.update({ where: { id: resetRecord.id }, data: { used: true } }),
    ])

    console.log(`[email-service] 🔑 Password reset successfully executed for ${resetRecord.admin.email}`)
    return { success: true, message: 'Password reset successfully. You can now log in.' }
  },
}
