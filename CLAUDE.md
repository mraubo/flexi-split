# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FlexiSplit** is a mobile-friendly web application for settling shared costs among groups of friends and families during trips and events. Users create settlements, add participants, record expenses, and finalize with optimized payment transfers.

## Tech Stack

- **Astro 5.13.7** with SSR (Node adapter in standalone mode, port 3000)
- **React 19** + **TypeScript 5** for interactive components
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin
- **shadcn/ui** components (built on Radix UI primitives)
- **Supabase** for PostgreSQL database, authentication, and real-time features
- **Zod 4** for schema validation
- **Bun 1.x** (preferred) / **Node.js 22.18.0** (via `.nvmrc`)
- **Testing:** Vitest (unit), Playwright (E2E), MSW (mocking)

## Development Commands

### Setup and Environment

```bash
# Use correct Node version
nvm use

# Install dependencies
bun install

# Initialize Supabase (first time only)
bunx supabase init
```

### Running the Application

```bash
# Start local Supabase
bunx supabase start

# Start Astro dev server (http://localhost:3000)
bun run dev

# Stop Supabase
bunx supabase stop

# Production build
bun run build

# Preview production build
bun run preview
```

### Database Operations

```bash
# Apply pending migrations
bunx supabase migration up

# Generate TypeScript types from schema
bunx supabase gen types typescript --local > src/db/database.types.ts
```

### Testing

```bash
# Run unit tests
bun run test:unit

# Run unit tests in watch mode
bun run test:unit:watch

# Run unit tests with coverage
bun run test:unit:coverage

# Run E2E tests
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui

# Run E2E tests in debug mode
bun run test:e2e:debug

# Generate E2E test code
bun run test:e2e:codegen

# Run all tests
bun run test:all
```

### Code Quality

```bash
# Lint
bun run lint

# Lint and fix
bun run lint:fix

# Format with Prettier
bun run format
```

## Architecture Overview

### Directory Structure

```
src/
├── db/                   # Supabase client setup and generated types
├── middleware/           # Authentication and routing middleware
├── pages/                # Astro pages and API endpoints
│   ├── api/             # RESTful API routes
│   │   ├── auth/        # Login, register, logout, password reset
│   │   └── settlements/ # Settlement, participant, expense endpoints
│   ├── auth/            # Authentication pages
│   └── settlements/     # Settlement pages
├── components/          # React and Astro components
│   ├── ui/              # shadcn/ui component library
│   ├── hooks/           # Custom React hooks
│   ├── auth/            # Authentication forms
│   └── expenses/        # Expense management components
├── lib/                 # Business logic and utilities
│   ├── services/        # Service layer (settlements, participants, expenses)
│   ├── validation/      # Zod schemas
│   ├── api.ts           # RFC 7807 error response utilities
│   └── errorMessages.ts # Standardized error messages
├── layouts/             # Astro layout components
├── styles/              # Global CSS
├── types.ts             # Shared TypeScript types (DTOs, commands)
└── test/                # Test utilities and MSW mocks

supabase/
└── migrations/          # Database migration files

tests/
├── unit/                # Vitest unit tests
└── e2e/                 # Playwright E2E tests
```

### Database Schema

**Core Tables:**

- **`settlements`**: Settlement sessions with title, owner, status (open/closed), currency, and counters
- **`participants`**: People in settlements with unique case-insensitive nicknames (max 10 per settlement)
- **`expenses`**: Individual expenses with payer, amount (stored in cents), date, description, and share count
- **`expense_participants`**: Many-to-many junction table between expenses and participants
- **`settlement_snapshots`**: Finalized balances and transfer calculations for closed settlements
- **`events`**: Audit trail for user actions

**Key Database Functions:**

- `calculate_settlement_balances(p_settlement_id)`: Calculates net balance per participant
- `finalize_settlement_transaction(...)`: Atomic transaction to close settlement and create snapshot
- Access control functions for ownership verification

### API Structure

All endpoints follow **RFC 7807 Problem Details** for error responses.

**Authentication:**

- `POST /api/auth/login`, `/register`, `/logout`, `/forgot-password`, `/reset-password`

**Settlements:**

- `GET /api/settlements` (list, paginated)
- `POST /api/settlements` (create)
- `GET/PUT/DELETE /api/settlements/{id}` (details, update, soft delete)
- `POST /api/settlements/{id}/close` (finalize settlement)
- `GET /api/settlements/{id}/snapshot` (get finalized snapshot)

**Participants:**

- `GET/POST /api/settlements/{settlement_id}/participants`
- `DELETE /api/settlements/{settlement_id}/participants/{id}`

**Expenses:**

- `GET/POST /api/settlements/{settlement_id}/expenses`
- `GET/PUT/DELETE /api/settlements/{settlement_id}/expenses/{id}`

**Response Format:**

```typescript
// Success
{ data: T | T[] }

// Error (RFC 7807)
{
  error: {
    code: string,      // Machine-readable error code
    message: string,   // Human-readable message
    details?: unknown, // Validation errors, etc.
    pointer?: string   // JSON Pointer to field
  }
}
```

### Authentication & Authorization

- **Middleware** (`src/middleware/index.ts`) extracts user from Supabase session and attaches to `context.locals.user`
- **Protected routes:** All except `/`, `/auth/*`, `/api/auth/*` require authentication
- **Ownership-based access:** Only settlement owners can modify their settlements
- **Settlement lifecycle:** Open (editable) → Closed (read-only)

### Service Layer Pattern

Business logic is isolated in `src/lib/services/`:

- **settlements.service.ts**: List, create, update, delete, access checks
- **participants.service.ts**: Add, list, remove participants
- **expenses.service.ts**: CRUD operations for expenses
- **settlements/finalizeSettlement.service.ts**: Balance calculation and transfer optimization

API endpoints validate inputs, delegate to services, and return standardized responses.

### Settlement Finalization Algorithm

1. Calculate net balance for each participant: `(payments made) - (shares in expenses)`
2. Separate creditors (positive balance) and debtors (negative balance)
3. Apply greedy matching algorithm: pair largest creditor with largest debtor
4. Create transfer for minimum of both amounts, remove settled parties, repeat
5. Store snapshot with balances and optimal transfer list

## Key Development Guidelines

### Code Quality

- **Early returns**: Handle errors and edge cases at the beginning of functions
- **Guard clauses**: Use preconditions to avoid deeply nested if statements
- **Error handling**: Implement proper error logging and user-friendly messages
- **Type safety**: Leverage TypeScript strictly; use generated database types
- **Linting feedback**: Use ESLint output to improve code quality

### Backend & Database

- **Supabase client**: Always use `context.locals` in Astro routes instead of direct imports
- **Type imports**: Use `SupabaseClient` type from `src/db/supabase.client.ts`, not `@supabase/supabase-js`
- **Validation**: Use Zod schemas for all data exchanged with backend
- **Migrations**: Follow naming convention `YYYYMMDDHHmmss_description.sql` (UTC time)
- **SQL style**: Lowercase, copious comments, enable RLS on all tables
- **RLS policies**: Granular policies per operation (select, insert, update, delete) and role (anon, authenticated)

### Frontend

- **Component choice**: Use Astro components for static content; React only when interactivity is needed
- **Tailwind CSS**: Use `@layer` directive, arbitrary values with `[]`, responsive and state variants
- **Accessibility**: Use ARIA landmarks, roles, labels; avoid redundant ARIA on semantic HTML

### Testing

- **Unit tests (Vitest):**
  - Use `vi.fn()` for mocks, `vi.spyOn()` for monitoring
  - Master `vi.mock()` factory patterns at file top level
  - Follow 'Arrange-Act-Assert' pattern
  - Enable TypeScript strict typing in tests
  - Use MSW for API mocking (setup in `src/test/setup.ts`)

- **E2E tests (Playwright):**
  - Base URL: `http://localhost:4321`
  - Browser: Chromium (Desktop)
  - Screenshots on failure, video retention
  - Trace recording on first retry

### Validation Schemas (Zod)

All validation schemas are in `src/lib/validation/`:

- `settlements.ts`: Settlement queries and commands
- `participants.ts`: Participant operations
- `expenses.ts`: Expense CRUD with pagination and filtering
- `auth.ts`: Login, register, password reset

### Important Constraints

- **Participant nickname**: Must match `^[a-z0-9_-]+$`, case-insensitive uniqueness per settlement
- **Max participants**: 10 per settlement
- **Expense amount**: Stored in cents, must be > 0
- **Settlement status**: Cannot modify participants/expenses when closed (returns 422)
- **Soft deletes**: Settlements use `deleted_at` column; filtered via `deleted_at IS NULL`

## Common Patterns

### Creating Database Migrations

1. Name file: `YYYYMMDDHHmmss_description.sql` (UTC time)
2. Include header comment with purpose and affected tables
3. Write lowercase SQL with thorough comments
4. Enable RLS on new tables
5. Create granular policies per operation and role

### Adding API Endpoints

1. Validate authentication via `context.locals.user`
2. Parse and validate request with Zod schema
3. Delegate to service layer
4. Return standardized response (RFC 7807 for errors)
5. Use appropriate HTTP status codes:
   - 200 OK, 201 Created, 204 No Content
   - 400 Bad Request (validation), 401 Unauthorized, 403 Forbidden, 404 Not Found
   - 422 Unprocessable Entity (business logic violation), 500 Internal Server Error

### Writing Services

1. Accept Supabase client and validated inputs
2. Handle database operations
3. Throw errors with clear codes (use constants from `errorMessages.ts`)
4. Return typed DTOs
5. Never trust client data; re-validate server-side

### Component Development

1. Use Astro for static components, React for interactive ones
2. Implement shadcn/ui components from `src/components/ui/`
3. Custom hooks in `src/components/hooks/`
4. Follow accessibility guidelines (ARIA, semantic HTML)
5. Use Tailwind utility classes; avoid custom CSS unless necessary

## Type Safety

- **Generated types**: `src/db/database.types.ts` (auto-generated from Supabase schema)
- **DTOs**: `src/types.ts` (SettlementDTO, ParticipantDTO, ExpenseDTO, etc.)
- **Commands/Queries**: `src/types.ts` (CreateSettlementCommand, GetExpensesQuery, etc.)
- **Validation**: Zod schemas in `src/lib/validation/`
- **Error types**: `ApiError`, `ApiErrorResponse` in `src/lib/api.ts`

## Git Commit Behavior

**IMPORTANT: Claude Code will NOT automatically commit changes.**

When code changes are complete:
1. Claude Code will review the changes and prepare a detailed commit message
2. Claude Code will present the proposed commit message to you for review
3. You must explicitly approve the commit before it is created
4. The commit message will follow conventional commits format and include context about the "why"

You can request a commit at any point by explicitly asking, e.g.:
- "Please commit these changes"
- "Create a commit for the updates you just made"
- "Can you commit the work we've done so far?"

This ensures you maintain full control over your git history and understand exactly what is being committed.

## Environment Variables

Required in `.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
```
