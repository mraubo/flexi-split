import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/db/database.types.ts";

const defaultUserId = import.meta.env.DEFAULT_USER_ID;

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

  // Optionally get user and add to context
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // For development, use DEFAULT_USER_ID if no authenticated user
    if (!user && defaultUserId) {
      context.locals.user = {
        id: defaultUserId,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: `dev-user-${defaultUserId}@example.com`,
      };
    } else {
      context.locals.user = error ? null : user;
    }
  } catch {
    // For development, use DEFAULT_USER_ID as fallback
    if (defaultUserId) {
      context.locals.user = {
        id: defaultUserId,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: `dev-user-${defaultUserId}@example.com`,
      };
    } else {
      context.locals.user = null;
    }
  }

  return next();
});
