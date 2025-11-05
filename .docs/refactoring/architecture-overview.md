# Architecture Overview - Post-Refactoring

**Last Updated:** 2025-11-05  
**Version:** 1.0  
**Status:** Production Ready

## 📐 Table of Contents

1. [Introduction](#introduction)
2. [Directory Structure](#directory-structure)
3. [Architecture Layers](#architecture-layers)
4. [Design Patterns](#design-patterns)
5. [Technology Stack](#technology-stack)
6. [Key Components](#key-components)
7. [Data Flow](#data-flow)
8. [SSR Compatibility](#ssr-compatibility)
9. [Best Practices](#best-practices)

## Introduction

This document describes the architecture of FlexiSplit after the comprehensive refactoring project. The application follows a layered architecture with clear separation of concerns, emphasizing code reusability, type safety, and maintainability.

### Architecture Goals

1. **Maintainability** - Easy to understand, modify, and extend
2. **Reusability** - Shared utilities and components across the application
3. **Type Safety** - Full TypeScript coverage with generated types
4. **Testability** - Clear boundaries for unit and E2E testing
5. **Performance** - Optimized rendering with proper caching strategies
6. **SSR Compatibility** - Works seamlessly with Astro's island architecture

## Directory Structure

```
src/
├── lib/                          # Business logic and utilities
│   ├── api/                      # API layer
│   │   ├── client.ts            # Typed HTTP client (123 LOC)
│   │   └── queryClient.ts       # TanStack Query config (86 LOC)
│   ├── hooks/                    # Custom React hooks
│   │   └── api/                 # API-specific hooks
│   │       ├── useAuth.ts       # Authentication hooks (165 LOC)
│   │       ├── useSettlements.ts # Settlement CRUD + snapshot (169 LOC)
│   │       ├── useParticipants.ts # Participant CRUD (95 LOC)
│   │       └── useExpenses.ts   # Expense CRUD (114 LOC)
│   ├── utils/                    # Shared utilities
│   │   ├── validators.ts        # 12 validation functions (241 LOC)
│   │   ├── formatters.ts        # 13 formatting functions (232 LOC)
│   │   └── settlementFormatters.ts # 3 specialized formatters (133 LOC)
│   ├── services/                 # Service layer (backend logic)
│   ├── validation/               # Zod schemas
│   └── errorMessages.ts          # Centralized error messages
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── form/                     # Shared form components
│   │   ├── FormField.tsx        # Generic field wrapper (35 LOC)
│   │   ├── FormLabel.tsx        # Consistent labels (25 LOC)
│   │   ├── FormError.tsx        # Error display (21 LOC)
│   │   └── NicknameInput.tsx    # Reusable nickname input (121 LOC)
│   ├── hooks/                    # Component-specific hooks
│   │   ├── useParticipantNickname.ts # Nickname validation (185 LOC)
│   │   ├── useNicknameValidation.ts  # Validation logic (146 LOC)
│   │   ├── useExpenseForm.ts    # Expense form state (303 LOC)
│   │   └── useSettlementSummary.ts # Summary state (180 LOC)
│   ├── auth/                     # Authentication components
│   ├── expenses/                 # Expense management components
│   └── (other feature components)
├── pages/                        # Astro pages and API endpoints
│   ├── api/                      # RESTful API routes
│   └── (page routes)
├── layouts/                      # Astro layouts
├── middleware/                   # Authentication middleware
└── db/                           # Database client and types

supabase/
└── migrations/                   # Database migrations

tests/
├── unit/                         # Vitest unit tests
└── e2e/                          # Playwright E2E tests
```

## Architecture Layers

### 1. Presentation Layer (React Components)

**Responsibility:** User interface and user interactions

**Components:**
- Page components (top-level views)
- Feature components (domain-specific UI)
- Shared form components (reusable UI elements)
- Layout components (page structure)

**Pattern:** Component composition with custom hooks for state management

**Example:**
```typescript
// ParticipantForm.tsx uses shared components and hooks
import { NicknameInput } from '@/components/form/NicknameInput';
import { useParticipantNickname } from '@/components/hooks/useParticipantNickname';

export function ParticipantForm({ onCreated }) {
  const { nickname, validation, updateValidation, isValid } = 
    useParticipantNickname(existingNicknames);
  
  return (
    <form>
      <NicknameInput
        value={nickname}
        validation={validation}
        onChange={updateValidation}
      />
    </form>
  );
}
```

### 2. State Management Layer (Custom Hooks)

**Responsibility:** Component state, form validation, and orchestration

**Hooks:**
- `useExpenseForm` - Expense form state and validation
- `useSettlementSummary` - Settlement summary data and formatting
- `useParticipantNickname` - Nickname validation state
- `useNicknameValidation` - Validation logic

**Pattern:** Hook composition - larger hooks delegate to smaller, focused hooks

**Example:**
```typescript
export function useExpenseForm(params) {
  // Uses shared validators
  const amountValidation = validateAmount(state.amountCents);
  const payerValidation = validatePayer(state.payerId, participants);
  
  // Manual fetch for SSR compatibility
  const response = await fetch('/api/settlements/.../expenses', {
    method: 'POST',
    body: JSON.stringify(command),
  });
  
  return { formState, updateField, submitForm };
}
```

### 3. API Layer (Query Hooks + HTTP Client)

**Responsibility:** Data fetching, caching, and mutations

**Components:**
- `apiClient` - Typed HTTP client with RFC 7807 error handling
- `queryClient` - TanStack Query configuration
- API hooks - `useSettlements`, `useParticipants`, `useExpenses`, `useAuth`

**Pattern:** TanStack Query for data operations with query key factories

**Example:**
```typescript
// useParticipants.ts
export const participantsQueryKeys = {
  all: () => ['participants'],
  bySettlement: (id) => [...participantsQueryKeys.all(), id],
  list: (id) => [...participantsQueryKeys.bySettlement(id), 'list'],
};

export function useParticipants(settlementId: UUID) {
  return useQuery({
    queryKey: participantsQueryKeys.list(settlementId),
    queryFn: () => apiClient.get(`/api/settlements/${settlementId}/participants`),
    enabled: !!settlementId,
  });
}
```

### 4. Utility Layer (Shared Functions)

**Responsibility:** Reusable logic for validation, formatting, and calculations

**Utilities:**
- **Validators** - Input validation with consistent error messages
- **Formatters** - Currency, date, and text formatting
- **Settlement Formatters** - Balance and transfer formatting

**Pattern:** Pure functions with clear inputs/outputs

**Example:**
```typescript
// validators.ts
export const validateAmount = (amount?: number): { valid: boolean; error?: string } => {
  if (!amount && amount !== 0) {
    return { valid: false, error: "Kwota jest wymagana" };
  }
  if (amount <= 0) {
    return { valid: false, error: "Kwota musi być większa od 0" };
  }
  return { valid: true };
};

// formatters.ts
export const formatCurrency = (amountCents: number, currency = "PLN"): string => {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
};
```

### 5. Service Layer (Backend Logic)

**Responsibility:** Business logic, database operations, and complex transactions

**Services:**
- Settlement services (CRUD, finalization)
- Participant services (add, update, remove)
- Expense services (CRUD)

**Pattern:** Service functions called from API endpoints

### 6. Data Layer (Supabase + PostgreSQL)

**Responsibility:** Data persistence, access control, and real-time features

**Components:**
- Supabase client
- Generated TypeScript types
- Database migrations
- Row-level security (RLS) policies

## Design Patterns

### 1. Hook Composition Pattern

**Purpose:** Break down complex hooks into smaller, focused hooks

**Example:**
```typescript
// Large hook delegates to smaller hooks
export function useExpenseForm(params) {
  // Validation logic
  const validateForm = useCallback((state) => {
    const errors = {};
    
    // Use shared validators
    const amountValidation = validateAmount(state.amountCents);
    if (!amountValidation.valid) {
      errors.amount = amountValidation.error;
    }
    
    return { ...state, errors, isValid: Object.keys(errors).length === 0 };
  }, []);
  
  // State management
  const [formState, setFormState] = useState(initialState);
  
  // API operations (manual fetch for SSR)
  const submitForm = async () => {
    const response = await fetch(url, { method, body });
    // ...
  };
  
  return { formState, updateField, submitForm };
}
```

**Benefits:**
- Each hook has a single responsibility
- Easier to test in isolation
- Better code reuse

### 2. Query Key Factory Pattern

**Purpose:** Centralized cache key management for TanStack Query

**Example:**
```typescript
export const settlementsQueryKeys = {
  all: () => ['settlements'],
  lists: () => [...settlementsQueryKeys.all(), 'list'],
  list: (filters) => [...settlementsQueryKeys.lists(), filters],
  details: () => [...settlementsQueryKeys.all(), 'detail'],
  detail: (id) => [...settlementsQueryKeys.details(), id],
  snapshots: () => [...settlementsQueryKeys.all(), 'snapshot'],
  snapshot: (id) => [...settlementsQueryKeys.snapshots(), id],
};
```

**Benefits:**
- Consistent cache keys across the app
- Easy to invalidate related queries
- Type-safe key generation

### 3. Service Layer Pattern

**Purpose:** Separate business logic from API endpoints

**Example:**
```typescript
// Service function
export async function createParticipant(
  supabase: SupabaseClient,
  settlementId: UUID,
  command: CreateParticipantCommand
): Promise<ParticipantDTO> {
  // Business logic here
  const { data, error } = await supabase
    .from('participants')
    .insert({ settlement_id: settlementId, nickname: command.nickname })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// API endpoint
export async function POST({ params, request, locals }) {
  const command = await request.json();
  const validated = CreateParticipantCommandSchema.parse(command);
  const participant = await createParticipant(locals.supabase, params.id, validated);
  return json({ data: participant });
}
```

**Benefits:**
- Business logic testable independently
- API endpoints stay thin
- Logic reusable across endpoints

### 4. Separation of Concerns

**Purpose:** Clear boundaries between layers

**Layers:**
1. **Components** - UI and user interactions
2. **Hooks** - State management and orchestration
3. **API** - Data fetching and mutations
4. **Services** - Business logic
5. **Database** - Data persistence

**Benefits:**
- Changes isolated to specific layers
- Easier to reason about code
- Better testability

### 5. Manual Fetch for SSR Compatibility

**Purpose:** Ensure forms work reliably with Astro's SSR and island architecture

**Pattern:**
```typescript
// In forms and hooks used by forms
const submitForm = async () => {
  const response = await fetch('/api/...', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw errorData;
  }
  
  return response.json();
};
```

**Why not TanStack Query mutations?**
- QueryClient context may not be available during SSR/hydration
- Components use `client:idle` which means delayed hydration
- Manual fetch is more predictable in Astro islands
- TanStack Query still used for read operations

## Technology Stack

### Frontend
- **Astro 5.13.7** - SSR framework with island architecture
- **React 19** - UI library for interactive components
- **TypeScript 5** - Type safety and developer experience
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Component library built on Radix UI
- **TanStack Query** - Server state management and caching
- **react-hook-form** - Form state management (used in some forms)
- **Zod 4** - Schema validation

### Backend
- **Node.js 22.18.0** - Runtime environment
- **Supabase** - PostgreSQL database, auth, and real-time
- **PostgreSQL** - Relational database

### Development & Testing
- **Bun 1.x** - Package manager and test runner (preferred)
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing framework
- **MSW** - API mocking for tests
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Key Components

### API Client (`src/lib/api/client.ts`)

**Purpose:** Typed HTTP client with consistent error handling

**Features:**
- RFC 7807 error responses
- Type-safe request/response handling
- Automatic JSON serialization/deserialization
- Support for custom headers

**Usage:**
```typescript
import { apiClient } from '@/lib/api/client';

// GET request
const settlements = await apiClient.get<SettlementDTO[]>('/api/settlements');

// POST request
const newSettlement = await apiClient.post<SettlementDTO>(
  '/api/settlements',
  { title: 'Weekend Trip' }
);
```

### Query Client (`src/lib/api/queryClient.ts`)

**Purpose:** TanStack Query configuration

**Features:**
- Global query defaults
- Cache time configuration
- Retry strategies
- Error handling

### Validators (`src/lib/utils/validators.ts`)

**Purpose:** Centralized validation logic

**Functions:** 12 validators including:
- `validateNickname` - Nickname format validation
- `validateAmount` - Currency amount validation
- `validateDate` - Date format validation
- `validateEmail` - Email format validation
- `validatePassword` - Password strength validation
- `validatePayer` - Payer selection validation

### Formatters (`src/lib/utils/formatters.ts`)

**Purpose:** Consistent data formatting across the app

**Functions:** 13 formatters including:
- `formatCurrency` - Currency display with locale
- `formatDate` - Date display in Polish locale
- `formatCentsToAmount` - Convert cents to display string
- `parseAmountToCents` - Parse user input to cents
- `calculateShareInfo` - Calculate expense splits

### Form Components (`src/components/form/`)

**Purpose:** Reusable form UI elements with consistent styling

**Components:**
- `FormField` - Generic field wrapper with label and error
- `FormLabel` - Consistent label styling with required indicator
- `FormError` - Error message display with ARIA support
- `NicknameInput` - Specialized nickname input with validation feedback

## Data Flow

### Read Operations (TanStack Query)

```
User Action → Component
              ↓
          useQuery Hook (e.g., useParticipants)
              ↓
          API Client (HTTP GET)
              ↓
          API Endpoint (/api/settlements/:id/participants)
              ↓
          Service Layer (optional)
              ↓
          Database (Supabase)
              ↓
          ← Response (typed DTO)
              ↓
          ← Cache Update (TanStack Query)
              ↓
          ← Component Re-render
```

### Write Operations (Manual Fetch in Forms)

```
User Action → Form Component
              ↓
          Custom Hook (e.g., useExpenseForm)
              ↓
          Manual fetch() call
              ↓
          API Endpoint (POST/PUT/DELETE)
              ↓
          Zod Validation
              ↓
          Service Layer
              ↓
          Database (Supabase)
              ↓
          ← Response or Error
              ↓
          ← Form State Update
              ↓
          ← Component Re-render
```

### Write Operations (TanStack Query Mutations - for non-form scenarios)

```
User Action → Component
              ↓
          useMutation Hook
              ↓
          API Client (HTTP POST/PUT/DELETE)
              ↓
          API Endpoint
              ↓
          Service Layer
              ↓
          Database
              ↓
          ← Response
              ↓
          ← Cache Invalidation
              ↓
          ← Automatic Refetch
              ↓
          ← Component Re-render
```

## SSR Compatibility

### Astro Island Architecture

Astro uses "islands" of interactivity - React components are hydrated independently.

**Hydration Directives:**
- `client:load` - Hydrate immediately
- `client:idle` - Hydrate when browser idle
- `client:visible` - Hydrate when visible

### QueryClientProvider Setup

```astro
<!-- Layout.astro -->
<QueryClientProvider client:load>
  <Header />
  <main>
    <slot />
  </main>
</QueryClientProvider>
```

### Why Manual Fetch in Forms?

**Problem:** Components with `client:idle` may not have QueryClient context available during hydration.

**Solution:** Use manual `fetch()` in form submission handlers.

**Pattern:**
```typescript
// ✅ Safe for SSR
const submitForm = async () => {
  const response = await fetch('/api/...', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // ...
};

// ❌ May fail during hydration
const mutation = useCreateSettlement();
const submitForm = () => mutation.mutate(data);
```

### When to Use TanStack Query

**Use for:**
- Read operations (GET requests)
- Components that are always `client:load`
- Non-form mutations in fully hydrated components

**Don't use for:**
- Form submissions in `client:idle` components
- Components that may render during SSR
- Auth-related operations during initial load

## Best Practices

### 1. Type Safety

**Always use generated types:**
```typescript
import type { SettlementDTO, ParticipantDTO } from '@/types';
import type { Database } from '@/db/database.types';
```

**Use Zod for runtime validation:**
```typescript
const CreateSettlementSchema = z.object({
  title: z.string().min(1).max(100),
});

const validated = CreateSettlementSchema.parse(input);
```

### 2. Error Handling

**Use RFC 7807 format:**
```typescript
{
  error: {
    code: "validation_error",
    message: "Invalid input",
    details: { field: "email" }
  }
}
```

**Map errors to form fields:**
```typescript
if (error.code === "invalid_payer") {
  updateField("payerId", undefined);
}
```

### 3. Code Organization

**Keep hooks focused:**
- One responsibility per hook
- Compose larger hooks from smaller ones
- Extract shared logic to utilities

**Keep components simple:**
- Delegate logic to hooks
- Use shared components for consistency
- Keep JSX readable

### 4. Testing Strategy

**E2E Tests:**
- Test complete user flows
- Use Page Object Model
- Run before deployment

**Unit Tests (recommended):**
- Test validators in isolation
- Test formatters in isolation
- Test service layer functions

### 5. Performance

**Memoization:**
```typescript
const formattedBalances = useMemo(
  () => formatBalances(balances, participantsMap),
  [balances, participantsMap]
);
```

**Query caching:**
```typescript
// TanStack Query automatically caches
const { data } = useParticipants(settlementId);
// Subsequent calls use cached data
```

**Code splitting:**
```typescript
// Use dynamic imports for large components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Conclusion

The FlexiSplit architecture emphasizes:

1. **Clear separation of concerns** - Each layer has a specific responsibility
2. **Code reusability** - Shared utilities and components throughout
3. **Type safety** - Full TypeScript coverage
4. **SSR compatibility** - Works seamlessly with Astro's architecture
5. **Maintainability** - Easy to understand and modify

This architecture provides a solid foundation for continued development and feature additions.
