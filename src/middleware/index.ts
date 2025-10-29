import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/db/database.types.ts";

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
    } else {
      context.locals.user = null;
    }
  } catch {
    context.locals.user = null;
  }

  // Handle authentication redirects
  const pathname = context.url.pathname;

  // Skip auth redirects for API routes - they handle auth internally
  if (pathname.startsWith("/api/")) {
    return next();
  }

  // Skip auth redirects for error pages
  if (pathname.match(/^\/[0-9]{3}(\.astro)?$/)) {
    return next();
  }

  // Auth pages: redirect logged-in users to settlements
  if (pathname.startsWith("/auth/") && context.locals.user) {
    return context.redirect("/settlements");
  }

  // App pages: redirect unauthenticated users to login
  if (!pathname.startsWith("/auth/") && !context.locals.user) {
    return context.redirect("/auth/login");
  }

  return next();
});
