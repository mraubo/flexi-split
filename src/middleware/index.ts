import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client.ts";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  // Root page
  "/",
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase server instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

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

  // App pages: redirect unauthenticated users to login (except public paths)
  if (!PUBLIC_PATHS.includes(pathname) && !context.locals.user) {
    return context.redirect("/auth/login");
  }

  return next();
});
