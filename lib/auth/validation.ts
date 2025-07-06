import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
})

export const registerSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string()
    .min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
    .regex(/[A-Za-z]/, 'הסיסמה חייבת להכיל לפחות אות אחת')
    .regex(/[0-9]/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword']
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema> 