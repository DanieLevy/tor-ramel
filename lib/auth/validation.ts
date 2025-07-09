import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים')
})

export const registerSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword']
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema> 