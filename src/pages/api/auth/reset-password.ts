import type { APIRoute } from "astro";
import { ResetPasswordSchema } from "@/lib/validation/auth";
import type { ApiError, ResetPasswordDto } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is authenticated (recovery session should be active)
    if (!locals.user) {
      const error: ApiError = {
        status: 401,
        message: "Link resetowania jest nieprawidłowy lub wygasł",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const body: ResetPasswordDto = await request.json();

    const result = ResetPasswordSchema.safeParse(body);
    if (!result.success) {
      const error: ApiError = {
        status: 400,
        message: "Nieprawidłowe dane",
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

    // Update password using Supabase
    const { error: supabaseError } = await locals.supabase.auth.updateUser({
      password: result.data.password,
    });

    if (supabaseError) {
      // Map Supabase errors to appropriate HTTP responses
      let status = 500;
      let message = "Wystąpił błąd podczas resetowania hasła";

      if (supabaseError.message.includes("Password should be at least")) {
        status = 422;
        message = "Hasło nie spełnia wymagań bezpieczeństwa";
      } else if (supabaseError.message.includes("Same password")) {
        status = 422;
        message = "Nowe hasło nie może być takie samo jak obecne";
      } else if (supabaseError.message.includes("Too many requests")) {
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

    // Success
    return new Response(
      JSON.stringify({
        message: "Hasło zostało pomyślnie zmienione",
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
