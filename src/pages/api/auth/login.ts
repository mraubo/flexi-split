import type { APIRoute } from "astro";
import { LoginSchema } from "@/lib/validation/auth";
import type { ApiError, LoginDto } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse and validate input
    const body: LoginDto = await request.json();

    // Normalize email (trim and lowercase)
    const normalizedData = {
      email: body.email.trim().toLowerCase(),
      password: body.password,
    };

    const result = LoginSchema.safeParse(normalizedData);
    if (!result.success) {
      const error: ApiError = {
        status: 400,
        message: "Nieprawidłowe dane logowania",
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

    // Attempt login with Supabase
    const { data, error: supabaseError } = await locals.supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (supabaseError) {
      // Map Supabase errors to appropriate HTTP responses
      let status = 500;
      let message = "Wystąpił błąd podczas logowania";

      if (supabaseError.message.includes("Invalid login credentials")) {
        status = 401;
        message = "Nieprawidłowy adres e-mail lub hasło";
      } else if (supabaseError.message.includes("Email not confirmed")) {
        status = 401;
        message = "Adres e-mail nie został potwierdzony";
      } else if (supabaseError.message.includes("Too many requests")) {
        status = 429;
        message = "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.";
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

    // Success - return minimal user data
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
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
