import type { APIRoute } from "astro";
import { RegisterSchema } from "@/lib/validation/auth";
import type { ApiError, RegisterDto } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate input
    const body: RegisterDto = await request.json();

    // Normalize email (trim and lowercase)
    const normalizedData = {
      email: body.email.trim().toLowerCase(),
      password: body.password,
      confirmPassword: body.confirmPassword,
    };

    const result = RegisterSchema.safeParse(normalizedData);
    if (!result.success) {
      const error: ApiError = {
        status: 400,
        message: "Nieprawidłowe dane rejestracji",
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

    // Attempt registration with Supabase
    const { data, error: supabaseError } = await locals.supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
    });

    if (supabaseError) {
      // Map Supabase errors to appropriate HTTP responses
      let status = 500;
      let message = "Wystąpił błąd podczas rejestracji";

      if (supabaseError.message.includes("User already registered")) {
        status = 409;
        message = "Konto z tym adresem e-mail już istnieje";
      } else if (supabaseError.message.includes("Password should be at least")) {
        status = 422;
        message = "Hasło nie spełnia wymagań bezpieczeństwa";
      } else if (supabaseError.message.includes("Too many requests")) {
        status = 429;
        message = "Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę.";
      } else if (supabaseError.message.includes("Invalid email")) {
        status = 422;
        message = "Nieprawidłowy adres e-mail";
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

    // Success - check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation required
      return new Response(
        JSON.stringify({
          message: "Rejestracja zakończona pomyślnie. Sprawdź swoją skrzynkę e-mail i potwierdź konto.",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (data.user && data.session) {
      // Auto-confirmed (if enabled in Supabase)
      return new Response(
        JSON.stringify({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Unexpected response
    const error: ApiError = {
      status: 500,
      message: "Nieoczekiwana odpowiedź od serwera uwierzytelniania",
    };

    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
