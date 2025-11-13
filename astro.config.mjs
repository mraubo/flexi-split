// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  prerender: false,
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [
      // @ts-expect-error - Tailwind CSS Vite plugin has type compatibility issues with newer Vite versions
      tailwindcss(),
    ],
  },
  adapter: cloudflare(),
  env: {
    schema: {
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
});
