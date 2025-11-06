import { z } from "zod";

// Basic email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, "Nieprawidłowy adres e-mail"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .max(128, "Hasło może mieć maksymalnie 128 znaków"),
});

export type LoginInput = z.input<typeof LoginSchema>;
export type LoginOutput = z.output<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    email: z.string().regex(EMAIL_REGEX, "Nieprawidłowy adres e-mail"),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .max(128, "Hasło może mieć maksymalnie 128 znaków")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Hasło musi zawierać przynajmniej jedną małą literę, jedną wielką literę i jedną cyfrę"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.input<typeof RegisterSchema>;
export type RegisterOutput = z.output<typeof RegisterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, "Nieprawidłowy adres e-mail"),
});

export type ForgotPasswordInput = z.input<typeof ForgotPasswordSchema>;
export type ForgotPasswordOutput = z.output<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .max(128, "Hasło może mieć maksymalnie 128 znaków")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Hasło musi zawierać przynajmniej jedną małą literę, jedną wielką literę i jedną cyfrę"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.input<typeof ResetPasswordSchema>;
export type ResetPasswordOutput = z.output<typeof ResetPasswordSchema>;
