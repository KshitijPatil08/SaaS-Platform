import { z } from 'zod'

// Login request body
export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  mfaToken: z.string().length(6).optional(),
})

// Bootstrap a company + first admin
export const registerSchema = z.object({
  companyName: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
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

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type MfaEnrollInput = z.infer<typeof mfaEnrollSchema>
export type MfaConfirmInput = z.infer<typeof mfaConfirmSchema>
