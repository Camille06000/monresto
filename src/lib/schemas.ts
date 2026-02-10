import { z } from 'zod';

// Login schema - validation basique
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'validation.emailRequired')
    .email('validation.emailInvalid'),
  password: z
    .string()
    .min(1, 'validation.passwordRequired')
    .min(6, 'login.passwordMinLength'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Register schema - validation renforcée
export const registerSchema = z.object({
  fullName: z
    .string()
    .min(1, 'validation.nameRequired')
    .min(2, 'validation.nameMin'),
  email: z
    .string()
    .min(1, 'validation.emailRequired')
    .email('validation.emailInvalid'),
  password: z
    .string()
    .min(1, 'validation.passwordRequired')
    .min(8, 'validation.passwordMin')
    .regex(/[A-Z]/, 'validation.passwordUppercase')
    .regex(/[0-9]/, 'validation.passwordNumber'),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'validation.emailRequired')
    .email('validation.emailInvalid'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'validation.passwordRequired')
      .min(8, 'validation.passwordMin')
      .regex(/[A-Z]/, 'validation.passwordUppercase')
      .regex(/[0-9]/, 'validation.passwordNumber'),
    confirmPassword: z.string().min(1, 'validation.passwordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsMatch',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// Helper pour calculer la force du mot de passe
export function getPasswordStrength(password: string): {
  score: number;
  checks: {
    length: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
} {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  return { score, checks };
}
