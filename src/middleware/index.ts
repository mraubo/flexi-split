import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/db/database.types.ts";

const defaultUserId = import.meta.env.PUBLIC_DEFAULT_USER_ID;

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient<Database>(
    import.meta.env.SUPABASE_URL as string,
    import.meta.env.SUPABASE_KEY as string,
    {
      cookies: {
        getAll() {
          const cookies: { name: string; value: string }[] = [];
          // Get all cookie names from the request headers
          const cookieHeader = context.request.headers.get("cookie");
          if (cookieHeader) {
            cookieHeader.split(";").forEach((cookie) => {
              const [name, ...rest] = cookie.trim().split("=");
              if (name && rest.length > 0) {
                cookies.push({ name, value: rest.join("=") });
              }
            });
          }
          return cookies;
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Add supabase client to context
  context.locals.supabase = supabase;

  // Get user from session
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      context.locals.user = user;
    } else if (defaultUserId) {
      // For development, mock user object with PUBLIC_DEFAULT_USER_ID
      context.locals.user = {
        id: defaultUserId,
        email: "developer@example.com",
        created_at: "2025-10-17T09:43:35.926966+00:00",
        confirmed_at: "2025-10-17T09:43:35.934705+00:00",
        last_sign_in_at: undefined,
        phone: undefined,
        app_metadata: {
          provider: "email",
          providers: ["email"],
        },
        user_metadata: {
          email_verified: true,
        },
        updated_at: "2025-10-17T09:43:35.935357+00:00",
        confirmation_sent_at: undefined,
        is_anonymous: false,
        is_sso_user: false,
        invited_at: undefined,
        aud: "authenticated",
      };
    } else {
      context.locals.user = null;
    }
  } catch {
    // Fallback for development with PUBLIC_DEFAULT_USER_ID
    if (defaultUserId) {
      context.locals.user = {
        id: defaultUserId,
        email: "developer@example.com",
        created_at: "2025-10-17T09:43:35.926966+00:00",
        confirmed_at: "2025-10-17T09:43:35.934705+00:00",
        last_sign_in_at: undefined,
        phone: undefined,
        app_metadata: {
          provider: "email",
          providers: ["email"],
        },
        user_metadata: {
          email_verified: true,
        },
        updated_at: "2025-10-17T09:43:35.935357+00:00",
        confirmation_sent_at: undefined,
        is_anonymous: false,
        is_sso_user: false,
        invited_at: undefined,
        aud: "authenticated",
      };
    } else {
      context.locals.user = null;
    }
  }

  return next();
});
