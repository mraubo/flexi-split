# Flexi Split

![Status](https://img.shields.io/badge/status-WIP-orange) ![Astro](https://img.shields.io/badge/Astro-5.13.7-0f172a?logo=astro) ![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react) ![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-4.1.13-38B2AC?logo=tailwindcss) ![Bun](https://img.shields.io/badge/Bun-1.x-000000?logo=bun) ![Node](https://img.shields.io/badge/Node.js-22.18.0-339933?logo=node.js)

## Table of Contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

FlexiSplit is a simple, mobile application for one-time settlement of shared costs among groups of friends and families during trips and events.

## Tech stack

- Astro 5 (SSR with `@astrojs/node`, server port 3000)
- React 19 + TypeScript 5
- Tailwind CSS 4 via `@tailwindcss/vite`
- shadcn/ui components (with `@radix-ui/react-slot` and `lucide-react`)
- Bun (preferred package/runtime) and Node.js 22 (via `.nvmrc`)
- Tooling: ESLint 9, Prettier, Husky, lint-staged

- Testing: Unit — Vitest, React Testing Library, MSW, Supertest (API routes); E2E — Playwright; Coverage — c8/istanbul

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
bunx supabase init
```

If environment variables are needed, copy the example file and adjust values:

```bash
cp .env.example .env
```

### Development

```bash
bunx supabase start/stop

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

### Run database migrations

Apply pending database migrations to your local Supabase instance:

```bash
bunx supabase migration up
```

### Generate database types

Generate TypeScript types from your local Supabase database schema:

```bash
bunx supabase gen types typescript --local > src/db/database.types.ts
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
- `test:unit` — Run unit tests (Vitest)
- `test:unit:watch` — Run unit tests in watch mode
- `test:unit:coverage` — Run unit tests with coverage report
- `test:e2e` — Run E2E tests (Playwright)
- `test:e2e:ui` — Run E2E tests with UI mode
- `test:e2e:debug` — Run E2E tests in debug mode
- `test:e2e:codegen` — Generate E2E test code
- `test:all` — Run all tests

## Testing

### Unit Tests

Run unit tests with Vitest:

```bash
bun run test:unit
```

Watch mode (re-run on file changes):

```bash
bun run test:unit:watch
```

Generate coverage report:

```bash
bun run test:unit:coverage
```

### End-to-End (E2E) Tests

E2E tests are written with **Playwright** and cover complete user flows (login, create settlements, add participants, manage expenses, finalize). Tests use the **Page Object Model** pattern for maintainability.

See [E2E Testing Plan](/.docs/e2e-plan.md) for detailed documentation about test structure, page objects, and test scenarios.

#### Setup

Create a `.env.test` file in the project root with test environment variables. This file is required by `playwright.config.ts`:

```bash
cp .env.example .env.test
```

Edit `.env.test` and ensure it contains valid Supabase credentials (can use the same as development):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```

#### Running E2E Tests

Run all E2E tests:

```bash
bun run test:e2e
```

Run tests in UI mode (interactive, visual debugging):

```bash
bun run test:e2e:ui
```

Run tests in debug mode (step through with debugging tools):

```bash
bun run test:e2e:debug
```

Generate test code from user interactions:

```bash
bun run test:e2e:codegen
```

#### Test Structure

- **Test files**: `tests/e2e/*.spec.ts`
- **Page objects**: `tests/e2e/pages/**/*.ts`
- **Test utilities**: `src/test/` (shared helpers, MSW mocks)
- **Config**: `playwright.config.ts` (browser, baseURL, timeout, reporters)
- **Reports**: Generated in `tests/reports/` (HTML, JSON)
- **Artifacts**: Screenshots on failure (`tests/results/`), video on failure

#### Test Coverage

Current test scenarios cover:

- Authentication (login, register, logout)
- Settlement creation and management
- Participant management
- Expense tracking and splitting
- Settlement finalization and summary view

See [E2E Testing Plan](/.docs/e2e-plan.md) for the complete list of user flows and test scenarios.

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
