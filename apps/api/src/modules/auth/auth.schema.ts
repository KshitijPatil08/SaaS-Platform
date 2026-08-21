import { z } from 'zod'

// Shared password rule — applied on both register and password-change flows.
// Min 8 chars, at least one uppercase letter, at least one digit.
const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Login request body
export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128), // login: lenient — don't expose enforcement rules
  mfaToken: z.string().length(6).optional(),
})

// Bootstrap a company + first admin
export const registerSchema = z.object({
  companyName: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: passwordRule,
})

// MFA enrollment (verify password before generating secret)
export const mfaEnrollSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

// MFA confirmation (verify first TOTP, then enable)
export const mfaConfirmSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6),
})

// Step 1 of dedicated MFA page flow
export const mfaChallengeSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
})

// Step 2 of dedicated MFA page flow
export const mfaVerifySchema = z.object({
  mfaSessionToken: z.string().min(1).max(512),
  totpCode: z.string().length(6).regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

// Fix #4: Password reset — enforce same strength as registration
export const resetPasswordSchema = z.object({
  token: z.string().min(64).max(128),
  newPassword: passwordRule,
})

// Fix #10: Profile update — strict whitelist prevents mass-assignment
export const updateProfileSchema = z.object({
  companyName: z.string().min(2).max(120).optional(),
  email: z.string().email().max(255).optional(),
  currentPassword: z.string().min(8).max(128).optional(),
  newPassword: passwordRule.optional(),
  stripeId: z.string().max(100).optional().nullable(),
  // Disallow: role, mfa_enabled, mfa_secret, company_id — any extra fields are stripped by Zod
}).strict()

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type MfaEnrollInput = z.infer<typeof mfaEnrollSchema>
export type MfaConfirmInput = z.infer<typeof mfaConfirmSchema>
export type MfaChallengeInput = z.infer<typeof mfaChallengeSchema>
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
