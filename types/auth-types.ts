import { z } from "zod";
import { phoneRegEx } from "./user-types";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
export const signInSchema = z.object({
  identifier: z
    .string()
    .min(1, "Email or phone is required")
    .refine(
      (value) => {
        const trimmed = value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed) || phoneRegEx.test(trimmed);
      },
      {
        message: "Enter a valid email address or phone number",
      }
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(phoneRegEx, "Enter a valid phone number"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
  confirmPassword: z.string(),
  full_name: z.string().min(2, "Full name is required"),
  user_type: z.enum([
    "DISPATCH",
    "RIDER",
    "CUSTOMER",
    "RESTAURANT_VENDOR",
    "LAUNDRY_VENDOR",
  ]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// AUTH INTERFACES
// ============================================================================
export interface SignInCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  phone: string;
  password: string;
  full_name: string;
  user_type: string;
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

export interface AuthResponse {
  user: any;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
  } | null;
}