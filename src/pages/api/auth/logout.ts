import type { APIRoute } from "astro";
import type { ApiError } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    const { error: supabaseError } = await locals.supabase.auth.signOut();

    if (supabaseError) {
      const error: ApiError = {
        status: 500,
        message: "Wystąpił błąd podczas wylogowywania",
      };

      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - return minimal response
    return new Response(
      JSON.stringify({
        message: "Wylogowano pomyślnie",
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
