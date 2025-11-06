# Developer Guide: Working with the Refactored Codebase

## Table of Contents

1. [Introduction](#introduction)
2. [Adding a New Form](#adding-a-new-form)
3. [Using Shared Validators](#using-shared-validators)
4. [Using Shared Formatters](#using-shared-formatters)
5. [Creating New API Hooks](#creating-new-api-hooks)
6. [Using TanStack Query](#using-tanstack-query)
7. [Best Practices](#best-practices)

---

## Introduction

This guide provides practical examples and patterns for working with the refactored FlexiSplit codebase. It covers common development tasks and helps you follow established conventions.

### Key Architectural Decisions

- **SSR Compatibility First**: Forms use manual `fetch()` to work with Astro's island architecture
- **TanStack Query for Read Operations**: Use query hooks for data fetching when QueryClient is available
- **Shared Utilities**: Validators and formatters are centralized for consistency and reusability
- **Type Safety**: Leverage Zod schemas and TypeScript for robust validation

---

## Adding a New Form

### Step 1: Define Zod Schema

Create or extend schemas in `src/lib/validation/`:

```typescript
// src/lib/validation/myFeature.ts
import { z } from "zod";
import { UUID_PATTERN } from "./common";

export const createMyFeatureCommandSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(100, "Nazwa nie może być dłuższa niż 100 znaków"),
  value: z.coerce.number().int("Wartość musi być liczbą całkowitą").positive("Wartość musi być dodatnia"),
  participantId: z.string().regex(UUID_PATTERN, "Nieprawidłowy identyfikator uczestnika"),
});

export type CreateMyFeatureCommand = z.infer<typeof createMyFeatureCommandSchema>;
```

### Step 2: Create Form ViewModel

Define a view model type in your hook file:

```typescript
// src/components/hooks/useMyFeatureForm.ts
import type { UUID } from "@/types";

export interface MyFeatureFormVM {
  name: string;
  value: string; // String for input, converted to number on submit
  participantId: UUID | undefined;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

const initialState: MyFeatureFormVM = {
  name: "",
  value: "",
  participantId: undefined,
  errors: {},
  touched: {},
};
```

### Step 3: Implement Custom Hook with react-hook-form

```typescript
import { useState, useCallback } from "react";
import { createMyFeatureCommandSchema, type CreateMyFeatureCommand } from "@/lib/validation/myFeature";
import type { ApiError } from "@/lib/api";

export function useMyFeatureForm(settlementId: UUID, onSuccess?: () => void) {
  const [state, setState] = useState<MyFeatureFormVM>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  // Validation function
  const validateForm = useCallback((formState: MyFeatureFormVM): MyFeatureFormVM => {
    const errors: Record<string, string> = {};

    // Use shared validators when available
    if (!formState.name.trim()) {
      errors.name = "Nazwa jest wymagana";
    }

    if (!formState.value || Number(formState.value) <= 0) {
      errors.value = "Wartość musi być większa niż 0";
    }

    if (!formState.participantId) {
      errors.participantId = "Wybór uczestnika jest wymagany";
    }

    return { ...formState, errors };
  }, []);

  // Field change handler
  const handleChange = useCallback(
    (field: keyof MyFeatureFormVM) => (value: string | UUID | undefined) => {
      setState((prev) => {
        const updated = { ...prev, [field]: value, touched: { ...prev.touched, [field]: true } };
        return validateForm(updated);
      });
    },
    [validateForm]
  );

  // Submit handler with manual fetch()
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched
      const allTouched = Object.keys(state).reduce((acc, key) => ({ ...acc, [key]: true }), {});
      const validated = validateForm({ ...state, touched: allTouched });

      if (Object.keys(validated.errors).length > 0) {
        setState(validated);
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // Build command from form state
        const command: CreateMyFeatureCommand = {
          name: state.name,
          value: Number(state.value),
          participantId: state.participantId!,
        };

        // Validate with Zod
        const validatedCommand = createMyFeatureCommandSchema.parse(command);

        // Manual fetch for SSR compatibility
        const response = await fetch(`/api/settlements/${settlementId}/my-feature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedCommand),
        });

        const data = await response.json();

        if (!response.ok) {
          throw {
            status: response.status,
            code: data.error?.code || "UNKNOWN_ERROR",
            message: data.error?.message || "Wystąpił nieoczekiwany błąd",
          };
        }

        // Reset form on success
        setState(initialState);
        onSuccess?.();
      } catch (err) {
        setSubmitError(err as ApiError);
      } finally {
        setIsSubmitting(false);
      }
    },
    [state, settlementId, validateForm, onSuccess]
  );

  // Reset handler
  const handleReset = useCallback(() => {
    setState(initialState);
    setSubmitError(null);
  }, []);

  return {
    state,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    handleReset,
  };
}
```

### Step 4: Create Form Component

```typescript
// src/components/myFeature/MyFeatureForm.tsx
import { useMyFeatureForm } from "@/components/hooks/useMyFeatureForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UUID, ParticipantDTO } from "@/types";

interface MyFeatureFormProps {
  settlementId: UUID;
  participants: ParticipantDTO[];
  onSuccess?: () => void;
}

export function MyFeatureForm({ settlementId, participants, onSuccess }: MyFeatureFormProps) {
  const { state, isSubmitting, submitError, handleChange, handleSubmit } = useMyFeatureForm(
    settlementId,
    onSuccess
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name">Nazwa</Label>
        <Input
          id="name"
          type="text"
          value={state.name}
          onChange={(e) => handleChange("name")(e.target.value)}
          placeholder="Wprowadź nazwę"
          disabled={isSubmitting}
          className={state.touched.name && state.errors.name ? "border-destructive" : ""}
        />
        {state.touched.name && state.errors.name && (
          <p className="text-sm text-destructive">{state.errors.name}</p>
        )}
      </div>

      {/* Value Input */}
      <div className="space-y-2">
        <Label htmlFor="value">Wartość</Label>
        <Input
          id="value"
          type="number"
          value={state.value}
          onChange={(e) => handleChange("value")(e.target.value)}
          placeholder="0"
          disabled={isSubmitting}
          className={state.touched.value && state.errors.value ? "border-destructive" : ""}
        />
        {state.touched.value && state.errors.value && (
          <p className="text-sm text-destructive">{state.errors.value}</p>
        )}
      </div>

      {/* Participant Select */}
      <div className="space-y-2">
        <Label htmlFor="participant">Uczestnik</Label>
        <Select
          value={state.participantId}
          onValueChange={(value) => handleChange("participantId")(value as UUID)}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="participant"
            className={state.touched.participantId && state.errors.participantId ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Wybierz uczestnika" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nickname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.touched.participantId && state.errors.participantId && (
          <p className="text-sm text-destructive">{state.errors.participantId}</p>
        )}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {submitError.message}
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Dodawanie..." : "Dodaj"}
      </Button>
    </form>
  );
}
```

---

## Using Shared Validators

### Available Validators

Located in `src/lib/utils/validators.ts`:

```typescript
// Amount validation (in cents)
validateAmount(amountCents?: AmountCents): ValidationResult

// Payer validation
validatePayer(payerId?: string, participants?: Array<{ id: string }>): ValidationResult

// Participants validation (at least one selected)
validateParticipants(participantIds?: UUID[]): ValidationResult

// Date validation
validateDate(dateString?: string): ValidationResult

// Description validation
validateDescription(description?: string): ValidationResult
```

### Example Usage in Form Hook

```typescript
import {
  validateAmount,
  validatePayer,
  validateParticipants,
  validateDate,
  validateDescription,
} from "@/lib/utils/validators";

const validateForm = useCallback(
  (state: ExpenseFormVM): ExpenseFormVM => {
    const errors: Record<string, string> = {};

    // Validate amount
    const amountValidation = validateAmount(state.amountCents);
    if (!amountValidation.valid && amountValidation.error) {
      errors.amount = amountValidation.error;
    }

    // Validate payer
    const payerValidation = validatePayer(state.payerId, participants);
    if (!payerValidation.valid && payerValidation.error) {
      errors.payer = payerValidation.error;
    }

    // Validate participants
    const participantsValidation = validateParticipants(state.participantIds);
    if (!participantsValidation.valid && participantsValidation.error) {
      errors.participants = participantsValidation.error;
    }

    // Validate date
    const dateValidation = validateDate(state.date);
    if (!dateValidation.valid && dateValidation.error) {
      errors.date = dateValidation.error;
    }

    // Validate description
    const descriptionValidation = validateDescription(state.description);
    if (!descriptionValidation.valid && descriptionValidation.error) {
      errors.description = descriptionValidation.error;
    }

    return { ...state, errors };
  },
  [participants]
);
```

### Creating Custom Validators

Follow this pattern when adding new validators:

```typescript
// src/lib/utils/validators.ts

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const validateCustomField = (value?: string, options?: SomeOptions): ValidationResult => {
  // Early return for missing required values
  if (!value || value.trim() === "") {
    return { valid: false, error: "Pole jest wymagane" };
  }

  // Business logic validation
  if (value.length < 3) {
    return { valid: false, error: "Wartość musi mieć co najmniej 3 znaki" };
  }

  // Additional checks with options
  if (options?.maxLength && value.length > options.maxLength) {
    return { valid: false, error: `Wartość nie może być dłuższa niż ${options.maxLength} znaków` };
  }

  // Success
  return { valid: true };
};
```

---

## Using Shared Formatters

### Available Formatters

#### Currency Formatters (`src/lib/utils/formatters.ts`)

```typescript
// Format cents to display amount (e.g., 12345 → "123,45")
formatCurrency(amountCents: AmountCents): string

// Format cents to decimal string for input (e.g., 12345 → "123.45")
formatCentsToAmount(amountCents: AmountCents): string

// Parse input string to cents (e.g., "123.45" → 12345)
parseAmountToCents(amountString: string): AmountCents | null

// Calculate share information
calculateShareInfo(
  amountCents: AmountCents,
  shareCount: number
): { perPersonCents: AmountCents; perPersonFormatted: string; remainder: AmountCents }
```

#### Settlement Formatters (`src/lib/utils/settlementFormatters.ts`)

```typescript
// Format balance data with participant info
formatBalances(
  balances: Record<UUID, AmountCents> | undefined | null,
  participantsMap: Record<UUID, string>
): FormattedBalance[]

// Format transfer instructions
formatTransfers(
  transfers: Array<{ from: UUID; to: UUID; amount: AmountCents }> | undefined | null,
  participantsMap: Record<UUID, string>
): FormattedTransfer[]

// Calculate balance totals (positive/negative sums)
calculateBalanceTotals(
  balances: Record<UUID, AmountCents> | undefined | null
): BalanceTotals
```

### Example Usage in Components

#### Currency Formatting in Display

```typescript
// src/components/expenses/ExpenseCard.tsx
import { formatCurrency } from "@/lib/utils/formatters";

export function ExpenseCard({ expense }: { expense: ExpenseDTO }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{expense.description}</h3>
      <p className="text-2xl font-bold">{formatCurrency(expense.amount_cents)} PLN</p>
      <p className="text-sm text-muted-foreground">Płacił: {expense.payer_nickname}</p>
    </div>
  );
}
```

#### Amount Input with Parsing

```typescript
// src/components/expenses/AmountInput.tsx
import { parseAmountToCents, formatCentsToAmount } from "@/lib/utils/formatters";

export function AmountInput({ value, onChange }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value ? formatCentsToAmount(value) : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Parse to cents and notify parent
    const cents = parseAmountToCents(inputValue);
    onChange(cents);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      placeholder="0.00"
    />
  );
}
```

#### Share Preview with Calculation

```typescript
// src/components/expenses/SharePreview.tsx
import { calculateShareInfo } from "@/lib/utils/formatters";

export function SharePreview({ amountCents, shareCount }: SharePreviewProps) {
  const { perPersonFormatted, remainder } = calculateShareInfo(amountCents, shareCount);

  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-sm">
        Na osobę: <span className="font-semibold">{perPersonFormatted} PLN</span>
      </p>
      {remainder > 0 && (
        <p className="text-xs text-muted-foreground">
          Pozostało {remainder} gr do podziału
        </p>
      )}
    </div>
  );
}
```

#### Balance Formatting in Summary

```typescript
// src/components/hooks/useSettlementSummary.ts
import { formatBalances, formatTransfers, calculateBalanceTotals } from "@/lib/utils/settlementFormatters";

const formattedBalances = useMemo(
  () => formatBalances(settlementSnapshot?.balances, participantsMap),
  [settlementSnapshot?.balances, participantsMap]
);

const formattedTransfers = useMemo(
  () => formatTransfers(settlementSnapshot?.transfers, participantsMap),
  [settlementSnapshot?.transfers, participantsMap]
);

const balanceTotals = useMemo(
  () => calculateBalanceTotals(settlementSnapshot?.balances),
  [settlementSnapshot?.balances]
);
```

---

## Creating New API Hooks

### Query Key Factory Pattern

Always start by defining query keys for cache management:

```typescript
// src/lib/hooks/api/useMyFeature.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { UUID, MyFeatureDTO } from "@/types";

// Query key factory for cache management
export const myFeatureQueryKeys = {
  all: () => ["myFeature"] as const,
  bySettlement: (settlementId: UUID) => [...myFeatureQueryKeys.all(), settlementId] as const,
  list: (settlementId: UUID) => [...myFeatureQueryKeys.bySettlement(settlementId), "list"] as const,
  detail: (settlementId: UUID, featureId: UUID) =>
    [...myFeatureQueryKeys.bySettlement(settlementId), "detail", featureId] as const,
};
```

### Read Hook (useQuery)

```typescript
/**
 * Fetches all features for a settlement
 * @param settlementId - Settlement UUID
 * @returns Query result with features array
 */
export function useMyFeatures(settlementId: UUID) {
  return useQuery({
    queryKey: myFeatureQueryKeys.list(settlementId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: MyFeatureDTO[] }>(`/api/settlements/${settlementId}/my-feature`);
      return response.data;
    },
    enabled: !!settlementId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches a single feature by ID
 * @param settlementId - Settlement UUID
 * @param featureId - Feature UUID
 * @param enabled - Whether to run the query (default: true)
 */
export function useMyFeature(settlementId: UUID, featureId: UUID, enabled = true) {
  return useQuery({
    queryKey: myFeatureQueryKeys.detail(settlementId, featureId),
    queryFn: async () => {
      const response = await apiClient.get<MyFeatureDTO>(`/api/settlements/${settlementId}/my-feature/${featureId}`);
      return response;
    },
    enabled: enabled && !!settlementId && !!featureId,
  });
}
```

### Create Hook (useMutation)

```typescript
/**
 * Creates a new feature for a settlement
 * @param settlementId - Settlement UUID
 * @returns Mutation result with create function
 */
export function useCreateMyFeature(settlementId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: CreateMyFeatureCommand) => {
      const response = await apiClient.post<MyFeatureDTO>(`/api/settlements/${settlementId}/my-feature`, command);
      return response;
    },
    onSuccess: () => {
      // Invalidate list query to trigger refetch
      queryClient.invalidateQueries({
        queryKey: myFeatureQueryKeys.list(settlementId),
      });
    },
    onError: (error) => {
      console.error("Failed to create feature:", error);
    },
  });
}
```

### Update Hook (useMutation)

```typescript
/**
 * Updates an existing feature
 * @param settlementId - Settlement UUID
 * @returns Mutation result with update function
 */
export function useUpdateMyFeature(settlementId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, command }: { featureId: UUID; command: UpdateMyFeatureCommand }) => {
      const response = await apiClient.put<MyFeatureDTO>(
        `/api/settlements/${settlementId}/my-feature/${featureId}`,
        command
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({
        queryKey: myFeatureQueryKeys.list(settlementId),
      });
      queryClient.invalidateQueries({
        queryKey: myFeatureQueryKeys.detail(settlementId, variables.featureId),
      });
    },
  });
}
```

### Delete Hook (useMutation)

```typescript
/**
 * Deletes a feature
 * @param settlementId - Settlement UUID
 * @returns Mutation result with delete function
 */
export function useDeleteMyFeature(settlementId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: UUID) => {
      await apiClient.delete(`/api/settlements/${settlementId}/my-feature/${featureId}`);
    },
    onSuccess: () => {
      // Invalidate list query
      queryClient.invalidateQueries({
        queryKey: myFeatureQueryKeys.list(settlementId),
      });
    },
  });
}
```

### Using the Hooks in Components

```typescript
// src/components/myFeature/MyFeatureList.tsx
import { useMyFeatures, useDeleteMyFeature } from "@/lib/hooks/api/useMyFeature";
import type { UUID } from "@/types";

export function MyFeatureList({ settlementId }: { settlementId: UUID }) {
  const { data: features, isLoading, error } = useMyFeatures(settlementId);
  const deleteMutation = useDeleteMyFeature(settlementId);

  if (isLoading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error.message}</div>;

  const handleDelete = async (featureId: UUID) => {
    try {
      await deleteMutation.mutateAsync(featureId);
      // Success feedback
    } catch (err) {
      // Error handling
    }
  };

  return (
    <ul>
      {features?.map((feature) => (
        <li key={feature.id}>
          {feature.name}
          <button onClick={() => handleDelete(feature.id)}>Usuń</button>
        </li>
      ))}
    </ul>
  );
}
```

---

## Using TanStack Query

### When to Use TanStack Query

✅ **Use TanStack Query hooks when:**

- Fetching data for display (read operations)
- Component uses `client:load` hydration
- QueryClient is guaranteed to be available
- You need automatic caching and refetching
- Component is fully hydrated on client

❌ **Use manual `fetch()` when:**

- Form submissions (create/update operations)
- Component uses `client:idle` hydration
- Running in SSR context where QueryClient may not be available
- Need guaranteed execution without dependencies

### Understanding the Pattern

**Why not use useMutation everywhere?**

The project discovered that TanStack Query mutations can fail in Astro's island architecture when:

1. Component uses `client:idle` hydration
2. QueryClientProvider may not be available during initial render
3. Error: "No QueryClient set, use QueryClientProvider to set one"

**Solution:**

- **Read operations**: Use `useQuery` hooks (caching benefits)
- **Write operations in forms**: Use manual `fetch()` (reliability in all contexts)

### Example: Correct Pattern in Form Hook

```typescript
// ✅ CORRECT: Manual fetch for form submission
export function useExpenseForm(settlementId: UUID, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const response = await fetch(`/api/settlements/${settlementId}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });

        const data = await response.json();

        if (!response.ok) {
          throw {
            status: response.status,
            code: data.error?.code || "UNKNOWN_ERROR",
            message: data.error?.message || "Wystąpił nieoczekiwany błąd",
          };
        }

        onSuccess?.();
      } catch (err) {
        setSubmitError(err as ApiError);
      } finally {
        setIsSubmitting(false);
      }
    },
    [settlementId, onSuccess]
  );

  return { handleSubmit, isSubmitting, submitError };
}
```

```typescript
// ❌ INCORRECT: useMutation in client:idle context
// This can fail with "No QueryClient set" error
export function useExpenseForm(settlementId: UUID) {
  const createMutation = useCreateExpense(settlementId); // May fail!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync(command); // QueryClient not available
  };

  return { handleSubmit };
}
```

### Query Configuration Best Practices

```typescript
// Configure query with appropriate options
export function useMyFeatures(settlementId: UUID) {
  return useQuery({
    queryKey: myFeatureQueryKeys.list(settlementId),
    queryFn: async () => {
      const response = await apiClient.get<{ data: MyFeatureDTO[] }>(`/api/settlements/${settlementId}/my-feature`);
      return response.data;
    },
    // Enable query only when settlementId is available
    enabled: !!settlementId,

    // Cache for 5 minutes before marking as stale
    staleTime: 5 * 60 * 1000,

    // Retry failed requests up to 3 times
    retry: 3,

    // Refetch on window focus for fresh data
    refetchOnWindowFocus: true,

    // Don't refetch on component mount if data is fresh
    refetchOnMount: false,
  });
}
```

### Prefetching Data

```typescript
// Prefetch data before it's needed (e.g., on hover)
export function MyFeatureCard({ settlementId, featureId }: Props) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: myFeatureQueryKeys.detail(settlementId, featureId),
      queryFn: () => apiClient.get(`/api/settlements/${settlementId}/my-feature/${featureId}`),
    });
  };

  return <div onMouseEnter={handleMouseEnter}>...</div>;
}
```

---

## Best Practices

### 1. Type Safety

#### Always use generated types

```typescript
// ✅ CORRECT: Use generated database types
import type { Database } from "@/db/database.types";
import type { UUID, ExpenseDTO } from "@/types";

// ❌ INCORRECT: Don't use any or unknown unnecessarily
const expense: any = await fetchExpense();
```

#### Define explicit DTOs

```typescript
// ✅ CORRECT: Define clear DTOs in src/types.ts
export interface CreateExpenseCommand {
  payer_id: UUID;
  amount_cents: AmountCents;
  description: string;
  expense_date: string;
  participant_ids: UUID[];
}

// Use in API
export async function createExpense(command: CreateExpenseCommand): Promise<ExpenseDTO> {
  // Implementation
}
```

### 2. Error Handling

#### Use RFC 7807 error format

```typescript
// ✅ CORRECT: Return standardized error responses
import { createErrorResponse, ERROR_CODES } from "@/lib/api";

try {
  // Operation
} catch (err) {
  return createErrorResponse(
    {
      code: ERROR_CODES.SETTLEMENT_CLOSED,
      message: "Cannot modify closed settlement",
    },
    422
  );
}
```

#### Handle errors in hooks

```typescript
// ✅ CORRECT: Provide clear error states
export function useMyFeatureForm() {
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      // Submit logic
    } catch (err) {
      setSubmitError(err as ApiError);
    }
  };

  return { handleSubmit, submitError };
}
```

#### Display user-friendly errors

```typescript
// ✅ CORRECT: Show helpful error messages
{submitError && (
  <div className="rounded-md bg-destructive/10 p-3">
    <p className="text-sm text-destructive">{submitError.message}</p>
    {submitError.code === "SETTLEMENT_CLOSED" && (
      <p className="text-xs text-muted-foreground">
        Zamknięte rozliczenie nie może być edytowane
      </p>
    )}
  </div>
)}
```

### 3. Code Organization

#### Group related files

```
src/lib/hooks/api/
  ├── useSettlements.ts     # Settlement queries
  ├── useParticipants.ts    # Participant queries
  └── useExpenses.ts        # Expense queries
```

#### Use barrel exports

```typescript
// src/lib/hooks/api/index.ts
export * from "./useSettlements";
export * from "./useParticipants";
export * from "./useExpenses";

// Usage
import { useSettlements, useParticipants, useExpenses } from "@/lib/hooks/api";
```

#### Separate concerns

```typescript
// ✅ CORRECT: Clear separation
// src/lib/services/expenses.service.ts - Business logic
// src/lib/hooks/api/useExpenses.ts - API hooks
// src/components/hooks/useExpenseForm.ts - Form state management
// src/components/expenses/ExpenseForm.tsx - UI

// ❌ INCORRECT: Mixed concerns
// ExpenseForm.tsx - UI + API + business logic all in one
```

### 4. Testing

#### Write testable code

```typescript
// ✅ CORRECT: Pure function, easy to test
export function calculateShareInfo(amountCents: AmountCents, shareCount: number) {
  if (shareCount <= 0) return { perPersonCents: 0, perPersonFormatted: "0,00", remainder: 0 };
  const perPersonCents = Math.floor(amountCents / shareCount);
  const remainder = amountCents % shareCount;
  return {
    perPersonCents,
    perPersonFormatted: formatCurrency(perPersonCents),
    remainder,
  };
}
```

#### Mock API calls with MSW

```typescript
// tests/unit/hooks/useExpenses.test.ts
import { server } from "@/test/setup";
import { http, HttpResponse } from "msw";

it("fetches expenses successfully", async () => {
  server.use(
    http.get("/api/settlements/:id/expenses", () => {
      return HttpResponse.json({
        data: [{ id: "1", description: "Test", amount_cents: 1000 }],
      });
    })
  );

  const { result } = renderHook(() => useExpenses("settlement-1"));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});
```

#### Test edge cases

```typescript
// ✅ CORRECT: Test validation edge cases
describe("validateAmount", () => {
  it("rejects zero amount", () => {
    expect(validateAmount(0).valid).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(validateAmount(-100).valid).toBe(false);
  });

  it("accepts positive amount", () => {
    expect(validateAmount(100).valid).toBe(true);
  });

  it("rejects undefined", () => {
    expect(validateAmount(undefined).valid).toBe(false);
  });
});
```

### 5. Performance

#### Memoize expensive calculations

```typescript
// ✅ CORRECT: Use useMemo for expensive operations
const formattedBalances = useMemo(() => formatBalances(balances, participantsMap), [balances, participantsMap]);
```

#### Optimize re-renders

```typescript
// ✅ CORRECT: Use useCallback for stable function references
const handleChange = useCallback(
  (field: string) => (value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
  },
  [] // No dependencies, stable reference
);
```

#### Lazy load heavy components

```typescript
// ✅ CORRECT: Lazy load charts or heavy visualizations
const ExpenseChart = lazy(() => import("@/components/expenses/ExpenseChart"));

<Suspense fallback={<div>Ładowanie wykresu...</div>}>
  <ExpenseChart expenses={expenses} />
</Suspense>
```

### 6. SSR Compatibility

#### Check for window/document

```typescript
// ✅ CORRECT: Guard browser-only APIs
if (typeof window !== "undefined") {
  localStorage.setItem("key", "value");
}
```

#### Use appropriate hydration

```typescript
// client:load - Load and hydrate immediately
<ExpenseList client:load expenses={expenses} />

// client:idle - Load after page is interactive
<SettlementSummary client:idle settlementId={id} />

// client:visible - Load when scrolled into view
<ExpenseChart client:visible expenses={expenses} />
```

### 7. Accessibility

#### Use semantic HTML

```typescript
// ✅ CORRECT: Semantic and accessible
<form onSubmit={handleSubmit}>
  <label htmlFor="amount">Kwota</label>
  <input id="amount" type="number" aria-describedby="amount-error" />
  <p id="amount-error" role="alert">{error}</p>
</form>

// ❌ INCORRECT: Div soup
<div onClick={handleSubmit}>
  <div>Kwota</div>
  <div contentEditable />
  <div>{error}</div>
</div>
```

#### Provide ARIA labels

```typescript
// ✅ CORRECT: Clear labels for screen readers
<button
  aria-label="Usuń wydatek Kolacja w restauracji"
  onClick={() => handleDelete(expense.id)}
>
  <TrashIcon />
</button>
```

---

## Summary

This guide provides practical patterns and examples for working with the refactored FlexiSplit codebase. Key takeaways:

1. **Forms use manual fetch()** for SSR compatibility
2. **TanStack Query for read operations** when QueryClient is available
3. **Shared validators and formatters** for consistency
4. **Type safety throughout** with Zod and TypeScript
5. **Clear separation of concerns** across layers
6. **Comprehensive error handling** with RFC 7807 format
7. **Test-driven approach** with unit and E2E tests

For more details on architecture, see [architecture-overview.md](./architecture-overview.md).

For project metrics and ROI, see [07-final-summary.md](./07-final-summary.md).
