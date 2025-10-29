import type { APIRoute } from "astro";
import { ForgotPasswordSchema } from "@/lib/validation/auth";
import type { ApiError, ForgotPasswordDto } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate input
    const body: ForgotPasswordDto = await request.json();

    // Normalize email (trim and lowercase)
    const normalizedData = {
      email: body.email.trim().toLowerCase(),
    };

    const result = ForgotPasswordSchema.safeParse(normalizedData);
    if (!result.success) {
      const error: ApiError = {
        status: 400,
        message: "Nieprawidłowy adres e-mail",
        details: result.error.issues.map((issue) => ({
          field: issue.path[0] as string,
          message: issue.message,
        })),
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send password reset email using Supabase
    const { error: supabaseError } = await locals.supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
    });

    if (supabaseError) {
      // Map Supabase errors to appropriate HTTP responses
      let status = 500;
      let message = "Wystąpił błąd podczas wysyłania linku resetowania";

      if (supabaseError.message.includes("Too many requests")) {
        status = 429;
        message = "Zbyt wiele prób resetowania hasła. Spróbuj ponownie za chwilę.";
      }

      const error: ApiError = {
        status,
        message,
      };

      return new Response(JSON.stringify(error), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - return neutral message regardless of whether email exists
    // This prevents email enumeration attacks
    return new Response(
      JSON.stringify({
        message: "Jeśli podany adres e-mail istnieje w systemie, otrzymasz wiadomość z linkiem do resetowania hasła.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    // Handle unexpected errors
    const error: ApiError = {
      status: 500,
      message: "Wystąpił błąd serwera",
    };

    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
