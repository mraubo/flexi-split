# FAZA 1: Fundament - Infrastruktura API i Query

## Status: ✅ UKOŃCZONA

## Wprowadzone zmiany

### 1. Zainstalowane zależności

```bash
bun add react-hook-form @hookform/resolvers @tanstack/react-query
```

**Wersjach:**
- `react-hook-form@7.66.0` - Minimalizuje boilerplate formularzy
- `@hookform/resolvers@5.2.2` - Integracja z Zod validators
- `@tanstack/react-query@5.90.6` - Zarządzanie stanem serwera i caching

### 2. Typowany HTTP Client - `src/lib/api/client.ts`

**Cechy:**
- ✅ Obsługa RFC 7807 error format
- ✅ Type-safe request/response handling
- ✅ Automatyczne parsowanie JSON
- ✅ Obsługa HTTP metod: GET, POST, PUT, DELETE, PATCH
- ✅ Error handling z strukturą ApiError

**Przykład użycia:**

```typescript
import { apiClient } from "@/lib/api/client";

// GET request
const settlements = await apiClient.get("/api/settlements");

// POST request
const newSettlement = await apiClient.post("/api/settlements", {
  title: "Trip to Italy"
});

// PUT request
await apiClient.put("/api/settlements/123", { title: "Updated" });

// DELETE request
await apiClient.delete("/api/settlements/123");
```

### 3. QueryClient Configuration - `src/lib/api/queryClient.ts`

**Konfiguracja:**

| Opcja | Wartość | Opis |
|-------|---------|------|
| **Queries** |
| staleTime | 5 min | Dane świeże przez 5 minut |
| gcTime | 10 min | Utrzymuj cache przez 10 minut |
| retry | 3 razy | Powtórz dla 5xx błędów |
| refetchOnWindowFocus | true | Odśwież gdy wrócisz do okna |
| refetchOnMount | "stale" | Odśwież tylko jeśli stale |
| **Mutations** |
| retry | 1 raz | Jedna ponowna próba dla mutations |

**Singleton pattern:**

```typescript
import { getQueryClient } from "@/lib/api/queryClient";

const queryClient = getQueryClient(); // Zawsze ten sam instance
```

### 4. React QueryClient Provider - `src/components/QueryClientProvider.tsx`

**Nowy komponent React:**
- Otacza aplikację QueryClientProviderem
- Zarządza stanem query'ów dla całej aplikacji
- Wspiera hydration w Astro SSR

### 5. Zintegrowana QueryClient w Layoutach

**Modified files:**
- `src/layouts/Layout.astro` - dodano QueryClientProvider z `client:load`
- `src/layouts/AuthLayout.astro` - dodano QueryClientProvider z `client:load`

**Dlaczego `client:load`?**
- Ładuje QueryClientProvider zaraz po stronie
- Gwarantuje, że QueryClient jest dostępny dla wszystkich React componentów
- Umożliwia hydration dla SSR routes

### 6. Custom Query Hooks - Settlements

**File:** `src/lib/hooks/api/useSettlements.ts`

**Dostępne hooki:**

```typescript
// Pobranie wszystkich settlementów (z paginacją)
const { data, isLoading, error } = useSettlements({ page: 1, limit: 10 });

// Pobranie jednego settlementu
const { data: settlement } = useSettlement(settlementId);

// Utworzenie nowego settlementu
const createMutation = useCreateSettlement();
await createMutation.mutateAsync({ title: "New Settlement" });

// Aktualizacja settlementu
const updateMutation = useUpdateSettlement(settlementId);
await updateMutation.mutateAsync({ title: "Updated" });

// Usunięcie settlementu
const deleteMutation = useDeleteSettlement(settlementId);
await deleteMutation.mutateAsync();

// Zamknięcie settlementu
const closeMutation = useCloseSettlement(settlementId);
await closeMutation.mutateAsync();
```

**Query Key Management:**
- Centralizowana funkcja `settlementsQueryKeys` dla spójności
- Automatyczne invalation po mutacjach
- Optymalne cache management

### 7. Custom Query Hooks - Participants

**File:** `src/lib/hooks/api/useParticipants.ts`

**Dostępne hooki:**

```typescript
// Pobranie uczestników w settlemencie
const { data } = useParticipants(settlementId);

// Dodanie nowego uczestnika
const createMutation = useCreateParticipant(settlementId);
await createMutation.mutateAsync({ nickname: "john_doe" });

// Aktualizacja uczestnika
const updateMutation = useUpdateParticipant(settlementId, participantId);
await updateMutation.mutateAsync({ nickname: "jane_doe" });

// Usunięcie uczestnika
const deleteMutation = useDeleteParticipant(settlementId, participantId);
await deleteMutation.mutateAsync();
```

**Cascade invalidation:**
- Dodanie/zmiana uczestnika invalicuje listę expenses
- Usunięcie uczestnika invalicuje listę expenses
- Gwarantuje spójność danych

## Struktura katalogów po FAZIE 1

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts           ✨ NOWY - Typed HTTP client
│   │   └── queryClient.ts      ✨ NOWY - TanStack Query config
│   └── hooks/
│       └── api/
│           ├── useSettlements.ts    ✨ NOWY
│           └── useParticipants.ts   ✨ NOWY
├── components/
│   └── QueryClientProvider.tsx     ✨ NOWY
└── layouts/
    ├── Layout.astro            ✏️ MODIFIED
    └── AuthLayout.astro        ✏️ MODIFIED
```

## Następne kroki

FAZA 2: Shared Utilities
- Wydzielenie wspólnych validatorów
- Utworzenie reużywalnych form components
- Utility funkcje do formatowania

## Sprawdzenie działania

Aby sprawdzić, czy FAZA 1 działa prawidłowo:

```bash
# Uruchom dev server
bun run dev

# Sprawdź logs w konsoli przeglądarki
# Powinny być dostępne hook'i React Query
```

## Notatki dla developerów

### Przy używaniu nowych hook'ów:

1. **Zawsze import z `src/lib/hooks/api/`**
   ```typescript
   import { useSettlements, useCreateSettlement } from "@/lib/hooks/api/useSettlements";
   ```

2. **QueryClient jest singletonem**
   - Nie twórz własnych instancji QueryClient
   - Użyj `getQueryClient()` jeśli potrzebujesz direct access

3. **Error handling automatyczny**
   - ApiError jest rzucany automatycznie
   - Catch w mutation/query'ach

4. **Cache invalidation jest automatyczne**
   - Po mutacji dane się auto-invalicują
   - Nie musisz ręcznie invalidować

## Potencjalne problemy i rozwiązania

### Problem: QueryClient nie jest dostępny w React component
**Rozwiązanie:** Upewnij się, że component jest wrappowany w `<QueryClientProvider client:load>`

### Problem: Mutation nie invalicuje danych
**Rozwiązanie:** Sprawdź czy query key w `onSuccess` callback'u jest poprawny

### Problem: Infinite rerenders
**Rozwiązanie:** Sprawdź czy dependency array w `useEffect` jest prawidłowy

## Metryki po FAZIE 1

- ✅ 3 nowe pliki utility (`client.ts`, `queryClient.ts`, `QueryClientProvider.tsx`)
- ✅ 2 custom hooks do API queries (`useSettlements.ts`, `useParticipants.ts`)
- ✅ 2 layout'y zintegrowane z QueryClient
- ✅ Gotowe do integracji z formami (FAZA 2)
