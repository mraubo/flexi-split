import React from "react";
import { QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/api/queryClient";

interface QueryClientProviderProps {
  children: React.ReactNode;
}

/**
 * QueryClientProvider wrapper for Astro + React integration
 * Wraps React components with TanStack Query's QueryClientProvider
 *
 * Usage in Astro:
 * <QueryClientProvider client:load>
 *   <SomeReactComponent client:load />
 * </QueryClientProvider>
 */
export default function QueryClientProvider({ children }: QueryClientProviderProps) {
  const queryClient = getQueryClient();

  return <TanstackQueryClientProvider client={queryClient}>{children}</TanstackQueryClientProvider>;
}
