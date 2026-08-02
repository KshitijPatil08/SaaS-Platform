import crypto from 'crypto'
import { prisma } from './prisma'
import { config } from './config'

export const emailService = {
  /**
   * Generates a 64-char hex password reset token, saves it to PasswordResetToken table,
   * and dispatches a password reset email (simulated SMTP / Resend delivery).
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
      data: {
        token: rawToken,
        admin_id: admin.id,
        expires_at: expiresAt,
        used: false,
      },
    })

    const resetLink = `${config.clientOrigin}/login?reset_token=${rawToken}`

    // Log the transactional email delivery dispatch
    console.log(`[email-service] ✉️ Password Reset Email sent to ${email}`)
    console.log(`[email-service] Reset Link: ${resetLink}`)

    return {
      success: true,
      message: `Password reset link generated and dispatched to ${email}`,
      resetLink: config.isProduction ? undefined : resetLink, // return link only in dev environment for easy testing
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
      prisma.adminUser.update({
        where: { id: resetRecord.admin_id },
        data: { password_hash },
      }),
      (prisma as any).passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ])

    console.log(`[email-service] 🔑 Password reset successfully executed for ${resetRecord.admin.email}`)
    return { success: true, message: 'Password reset successfully. You can now log in.' }
  },
}
