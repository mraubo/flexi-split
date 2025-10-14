## Plan wdrożenia endpointu API: GET /settlements

### 1. Przegląd punktu końcowego

- **Cel**: Zwrot listy rozliczeń (settlements) zalogowanego użytkownika z filtrami, sortowaniem i paginacją.
- **Zgodność biznesowa**: Dane i ograniczenia zgodne z planem bazy (`.docs/db-plan.md`) i kontraktem (`.docs/api-plan.md`).
- **Warstwa dostępu**: RLS w Supabase wymusza dostęp tylko do rekordów właściciela (`auth.uid()`).

### 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **URL**: `/settlements`
  - Uwaga implementacyjna w Astro: endpoint zostanie umieszczony w `src/pages/api/settlements/index.ts` (ścieżka publiczna: `/api/settlements`). Jeżeli produkt wymaga dokładnie `/settlements`, można dodać alias/rewrite na poziomie edge/routera. Kontrakt odpowiedzi pozostaje identyczny.
- **Parametry zapytania**:
  - **status** (opcjonalny): `open | closed`
  - **page** (opcjonalny): liczba całkowita, domyślnie `1`, minimalnie `1`
  - **limit** (opcjonalny): liczba całkowita, domyślnie `20`, maksymalnie `50`
  - **sort_by** (opcjonalny): `created_at | updated_at | title`
  - **sort_order** (opcjonalny): `asc | desc` (domyślnie `desc`)
- **Body**: brak
- **Wymagane nagłówki/cookies**: sesja Supabase (JWT) w ciasteczku HTTP-only dla uwierzytelnienia po stronie serwera.

### 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `SettlementSummaryDTO`
  - `SettlementsListResponse` (`PagedResponse<SettlementSummaryDTO>`, z `PaginationMeta`)
  - `GetSettlementsQuery` + pomocnicze: `SettlementSortBy`, `SortOrder`
- Walidacja: nowy schemat Zod dla zapytań (np. `GetSettlementsQuerySchema`) zgodny z `GetSettlementsQuery`.

### 4. Szczegóły odpowiedzi

- **Status**: `200 OK`
- **Struktura**: `SettlementsListResponse`

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "status": "open|closed",
      "currency": "PLN",
      "participants_count": 0,
      "expenses_count": 0,
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "closed_at": "timestamp|null",
      "last_edited_by": "uuid|null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### 5. Przepływ danych

1. Żądanie trafia do endpointu Astro `GET` w `src/pages/api/settlements/index.ts` z `export const prerender = false`.
2. Middleware (`src/middleware/index.ts`) udostępnia w `context.locals` instancję Supabase powiązaną z sesją użytkownika (SSR), np. `context.locals.supabase`.
3. Endpoint:
   - Parsuje i waliduje parametry zapytania Zodem.
   - Ustala: `page`, `limit`, `sortBy`, `sortOrder`, opcjonalnie `status`.
   - Buduje zapytanie do Supabase z białą listą kolumn i sortowań:
     - Tabela: `settlements` (RLS filtruje po `auth.uid()` → tylko rekordy właściciela).
     - Selekcja: `id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by` z `{ count: 'exact' }`.
     - Filtr: `eq('status', status)` jeśli podano.
     - Sortowanie: `order(sortBy, { ascending: sortOrder === 'asc' })` (mapowanie nazw do kolumn jest jawne, niedozwolone wartości odrzucane przez Zod/mapping).
     - Stronicowanie: `range(offset, offset + limit - 1)` gdzie `offset = (page - 1) * limit`.
   - Na podstawie `count` oblicza `total_pages = Math.ceil(total / limit)`.
   - Zwraca `200` z `SettlementsListResponse`.
4. W przypadku braku sesji użytkownika (brak JWT) zwracane jest `401` (patrz sekcja bezpieczeństwa/obsługa błędów).

### 6. Względy bezpieczeństwa

- **Uwierzytelnianie**: Supabase Auth (JWT w cookie HTTP-only). Na starcie endpointu sprawdzamy sesję (`getUser()`/`getSession()` na kliencie SSR). Brak sesji → `401`.
- **Autoryzacja**: RLS w tabeli `settlements` ogranicza odczyt do `owner_id = auth.uid()` (patrz `.docs/db-plan.md`). Brak dodatkowych filtrów po stronie aplikacji.
- **Walidacja wejścia**: Zod + ścisłe mapowanie `sort_by`/`sort_order` → wyłącznie dozwolone wartości; w przypadku wartości spoza whitelisty → `400`.
- **Ekspozycja danych**: selekcja tylko pól z kontraktu; nie zwracamy `owner_id`.
- **Nagłówki i cookies**: korzystamy z ciasteczek `HttpOnly`, `Secure`, `SameSite=Lax/Strict`. Brak manualnej obsługi tokenów w query/body.
- **Rate limiting (opcjonalnie)**: jeśli wymagane, dodać limit na IP/user (np. middleware) — poza MVP.
- **CORS**: jeśli endpoint będzie konsumowany przez front spoza tej samej domeny, skonfigurować odpowiednie nagłówki (poza MVP).

### 7. Obsługa błędów

- **400 Bad Request**: nieprawidłowe parametry (np. `limit > 50`, `page < 1`, `sort_by` spoza whitelisty). Zwrócić komunikat walidacji Zod.
- **401 Unauthorized**: brak ważnej sesji użytkownika (brak/niepoprawny JWT w cookie). Nie ujawniać szczegółów.
- **403 Forbidden**: błąd uprawnień z Supabase (np. komunikat o RLS/permission denied).
- **500 Internal Server Error**: niespodziewane błędy Supabase/serwera. Zwrócić generyczny komunikat, bez szczegółów implementacyjnych.

Przykładowe odpowiedzi błędów (schematycznie):

```json
// 400
{ "error": { "code": "invalid_query", "message": "limit must be <= 50" } }

// 401
{ "error": { "code": "unauthorized", "message": "authentication required" } }

// 403
{ "error": { "code": "forbidden", "message": "insufficient permissions" } }

// 500
{ "error": { "code": "server_error", "message": "unexpected error" } }
```

Rejestrowanie błędów: w MVP brak dedykowanej tabeli logów błędów w schemacie — logować strukturalnie do stdout/observability (np. `console.error` z kontekstem: `requestId`, `userId?`, `path`, `params`).

### 8. Rozważania dotyczące wydajności

- **Selektor kolumn**: wybierać tylko pola kontraktu, bez `*`.
- **Zliczanie**: `count: 'exact'` w Supabase jest wygodne, ale kosztowne na bardzo dużych zbiorach; tolerowalne w MVP. Dalsza optymalizacja: licznik denormalizowany, cache, lub `estimated`.
- **Indeksy**: zgodnie z `.docs/db-plan.md` są indeksy na `owner_id/status/created_at`, co wspiera najczęstsze sortowania i filtry.
- **Paginacja**: offset/limit wystarczy w MVP; dla bardzo dużych zbiorów rozważyć paginację „keyset” (po `created_at, id`).
- **Round trips**: pojedyncze zapytanie z licznikiem (data + count) minimalizuje liczbę wywołań.

### 9. Etapy wdrożenia

1. **SSR Supabase w middleware**:
   - Dodać zależność `@supabase/ssr` (serwerowa inicjalizacja z ciasteczkami).
   - Zmienić `src/middleware/index.ts`, aby tworzyć klienta per żądanie z kontekstu cookies i umieszczać go w `context.locals.supabase`.
   - (Opcjonalnie) Dodać `context.locals.user` po `getUser()`; rozszerzyć `src/env.d.ts` o typ dla `user`.
2. **Walidacja Zod**:
   - Utworzyć `src/lib/validation/settlements.ts` z `GetSettlementsQuerySchema` (status/page/limit/sort_by/sort_order z limitami i domyślnymi wartościami).
3. **Warstwa usług**:
   - Dodać `src/lib/services/settlements.service.ts` z funkcją `listSettlements(supabase, query): Promise<SettlementsListResponse>`.
   - Funkcja kapsułkuje: budowę zapytania, mapowanie sortów, liczenie `total_pages`.
4. **Endpoint**:
   - Utworzyć `src/pages/api/settlements/index.ts`:
     - `export const prerender = false`.
     - `export async function GET(context) { ... }`:
       - Walidacja query Zodem (z wartościami domyślnymi).
       - Sprawdzenie sesji (brak → `401`).
       - Wywołanie `listSettlements` i zwrot `200`.
       - Mapowanie wyjątków Supabase na `403/500`.
5. **Typy i importy**:
   - W endpointach wykorzystywać typy z `src/types.ts` (`SettlementsListResponse`, `GetSettlementsQuery`).
   - Korzystać z `context.locals.supabase` zamiast importować klienta bezpośrednio.
6. **Testy**:
   - Testy jednostkowe walidacji Zod (graniczne wartości `limit/page`, niepoprawne `sort_by`).
   - Test integracyjny „szczęśliwej ścieżki” zwracający paginowaną listę.
   - Test błędów: `401` (brak sesji), `400` (zły input), symulacja błędu RLS → `403`.
7. **Jakość**:
   - Uruchomić lint i formatowanie (`eslint`, `prettier`).
   - Przejrzeć logi i ewentualnie dodać korekty komunikatów błędów.

### 10. Szkice techniczne (fragmenty)

Walidacja Zod (propozycja):

```ts
import { z } from "zod";

export const GetSettlementsQuerySchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort_by: z.enum(["created_at", "updated_at", "title"]).default("created_at").optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
});
```

Mapowanie sortów (bezpieczne):

```ts
const sortColumnMap = {
  created_at: "created_at",
  updated_at: "updated_at",
  title: "title",
} as const;
```

Szkic usługi:

```ts
export async function listSettlements(supabase, q): Promise<SettlementsListResponse> {
  const sortColumn = sortColumnMap[q.sort_by ?? "created_at"];
  const ascending = (q.sort_order ?? "desc") === "asc";
  const offset = (q.page - 1) * q.limit;

  let query = supabase
    .from("settlements")
    .select(
      "id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by",
      { count: "exact" }
    )
    .order(sortColumn, { ascending })
    .range(offset, offset + q.limit - 1);

  if (q.status) query = query.eq("status", q.status);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  const total_pages = Math.max(1, Math.ceil(total / q.limit));
  return { data: data ?? [], pagination: { page: q.page, limit: q.limit, total, total_pages } };
}
```

Szkic endpointu Astro:

```ts
export const prerender = false;

export async function GET(context) {
  try {
    const { supabase } = context.locals;
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData?.user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "authentication required" } }), {
        status: 401,
      });
    }

    const parsed = GetSettlementsQuerySchema.safeParse(Object.fromEntries(context.url.searchParams));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: { code: "invalid_query", message: parsed.error.issues } }), {
        status: 400,
      });
    }

    const result = await listSettlements(supabase, parsed.data);
    return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    // Mapowanie Supabase/PostgREST błędów na 403/500 zależnie od treści
    const status = err?.code === "42501" || /permission/i.test(err?.message) ? 403 : 500;
    return new Response(
      JSON.stringify({ error: { code: status === 403 ? "forbidden" : "server_error", message: "unexpected error" } }),
      { status }
    );
  }
}
```

Zgodność z regułami:

- Użycie `context.locals.supabase` zamiast bezpośredniego importu klienta.
- `export const prerender = false` w endpointzie.
- Walidacja Zod w warstwie API.
- Logika DB w warstwie serwisu w `src/lib/services`.
