# Flex Spliter

![Status](https://img.shields.io/badge/status-WIP-orange) ![Astro](https://img.shields.io/badge/Astro-5.13.7-0f172a?logo=astro) ![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react) ![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-4.1.13-38B2AC?logo=tailwindcss) ![Bun](https://img.shields.io/badge/Bun-1.x-000000?logo=bun) ![Node](https://img.shields.io/badge/Node.js-22.18.0-339933?logo=node.js)

A modern Astro 5 + React 19 starter configured for SSR (Node adapter), Tailwind CSS 4, and shadcn/ui, optimized for Bun. Includes ESLint 9, Prettier, Husky, and lint-staged.

## Table of Contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

Flex Spliter is a lightweight web app scaffold built on Astro 5 with React 19 and Tailwind 4, ready for server-side rendering via the Node adapter. It is set up for fast local development with Bun and ships with opinionated linting, formatting, and UI utilities out of the box.

## Tech stack

- Astro 5 (SSR with `@astrojs/node`, server port 3000)
- React 19 + TypeScript 5
- Tailwind CSS 4 via `@tailwindcss/vite`
- shadcn/ui components (with `@radix-ui/react-slot` and `lucide-react`)
- Bun (preferred package/runtime) and Node.js 22 (via `.nvmrc`)
- Tooling: ESLint 9, Prettier, Husky, lint-staged

Key runtime/config files:

- `astro.config.mjs` — SSR enabled (`output: "server"`), Node adapter in standalone mode, Tailwind Vite plugin, server on port 3000.
- `.nvmrc` — Node version `22.18.0`.
- `package.json` — scripts and dependencies.

## Getting started locally

### Prerequisites

- Node.js 22.18.0 (recommended via nvm)
- Bun 1.x installed (`curl -fsSL https://bun.sh/install | bash`)

### Installation

```bash
nvm use
bun install
```

If environment variables are needed, copy the example file and adjust values:

```bash
cp .env.example .env
```

### Development

```bash
bun run dev
```

Visit `http://localhost:3000`.

### Production build

```bash
bun run build
```

### Preview production build

```bash
bun run preview
```

### Linting and formatting

```bash
bun run lint
bun run lint:fix
bun run format
```

## Available scripts

All scripts can be run with `bun run <script>`:

- `dev` — Start Astro dev server
- `build` — Build for production
- `preview` — Preview the production build
- `astro` — Run the Astro CLI
- `lint` — Lint the project with ESLint
- `lint:fix` — Lint and attempt autofixes
- `format` — Format with Prettier

## Project scope

Current structure:

```text
src/
  components/
    ui/
      button.tsx
    Welcome.astro
  layouts/
    Layout.astro
  lib/
    utils.ts
  pages/
    index.astro
  styles/
    global.css
```

- `src/pages` — Astro pages and routing
- `src/layouts` — Layout wrappers for pages
- `src/components` — UI components (Astro + React); `src/components/ui` for shadcn/ui
- `src/lib` — Utilities and helpers
- `src/styles` — Global styles (Tailwind 4)

Notes:

- SSR is enabled via the Node adapter (`standalone` mode), which suits traditional Node hosting and Dockerized deployments.
- Tailwind 4 is wired through the Vite plugin; no separate tailwind.config is required for basic usage.

## Project status

Version `0.0.1` — work in progress. Expect frequent changes.

## License

No license file detected. Until a license is added, all rights are reserved.
