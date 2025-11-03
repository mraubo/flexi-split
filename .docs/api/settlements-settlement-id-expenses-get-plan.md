Poniżej znajduje się analiza oraz kompletny plan wdrożenia endpointu GET /settlements/{settlement_id}/expenses zgodny ze stackiem (Astro API routes, Supabase z RLS, Zod) oraz dobrymi praktykami HTTP, bezpieczeństwa i wydajności dla środowiska Cloudflare.
Plan uwzględnia autoryzację, filtrację, paginację, sortowanie, spójne kody statusu, kontrakty DTO oraz cache z ETag dla efektywnego odświeżania danych.

<analysis>
1) Kluczowe punkty specyfikacji: endpoint GET do listowania wydatków w rozliczeniu z filtrami participant_id, date_from, date_to, paginacją, limitami i sortowaniem po expense_date, created_at, amount_cents; zwraca listę ExpenseDTO oraz metadane paginacji; kody: 200, 401, 403, 404.
2) Parametry: path settlement_id (wymagany), query opcjonalne participant_id, date_from, date_to, page, limit, sort_by, sort_order; metoda GET jest idempotentna.
3) DTO/Modele: ExpenseDTO, ExpenseParticipantMiniDTO, ExpensesListResponse, GetExpensesQuery; wszystkie zgodne z TypeScript i walidowane Zod po stronie API.
4) Logika w service: wyodrębnienie zapytań i mapowania rekordów do DTO do src/lib/services/expenses.service.ts, a handler HTTP w src/pages/api/ zarządza wyłącznie walidacją, autoryzacją, i serializacją odpowiedzi.
5) Walidacja: Zod do walidacji query (UUID, daty w formacie YYYY-MM-DD, page/limit, sort_by/sort_order) z limitami i defaultami zgodnymi ze specyfikacją; odrzucanie nieobsługiwanych pól.
6) Rejestrowanie błędów: strukturalne logi z kontekstem żądania i identyfikatorem korelacji; ewentualnie zapis metadanych do dedykowanej tabeli błędów lub telemetryjnej, nieujawniając danych wrażliwych w odpowiedzi klienta.
7) Bezpieczeństwo: Supabase RLS i polityki na tabelach wielodostępnych; wymagana autentykacja; ochrona przed IDOR poprzez sprawdzenie przynależności settlement_id/participant_id do przestrzeni użytkownika; ochrona i cache na krawędzi w Cloudflare.
8) Scenariusze błędów: 400 dla nieprawidłowych parametrów, 401 dla braku autentykacji, 403 dla braku uprawnień lub odrzuconych przez RLS, 404 dla nieistniejącego lub niedostępnego rozliczenia, 500 dla błędów serwera; opcjonalnie 429 z Retry-After przy limitowaniu.
</analysis>

# .ai/view-implementation-plan.md

### Przegląd punktu końcowego

- Endpoint służy do odczytu listy wydatków w ramach konkretnego rozliczenia i wspiera filtrowanie po uczestniku/płacącym, zakresie dat, paginację oraz sortowanie, zapewniając idempotentne i bezpieczne wywołanie GET.
- Implementacja będzie zrealizowana jako Astro API Route w pliku pod ścieżką odpowiadającą trasie, z handlerem GET, który waliduje wejście, wywołuje warstwę usługową i zwraca JSON z odpowiednimi nagłówkami.
- Autoryzacja i autentykacja opiera się o Supabase Auth i Row Level Security, dzięki czemu selekcja danych jest ograniczana do dozwolonych wierszy niezależnie od warstwy aplikacyjnej.

### Szczegóły żądania

- Metoda i ścieżka: GET /settlements/{settlement_id}/expenses, gdzie {settlement_id} jest UUID przekazanym jako parametr ścieżki w pliku dynamicznej trasy w src/pages/api/settlements//expenses.ts.
- Parametry zapytania (opcjonalne): participant_id (UUID), date_from (YYYY-MM-DD), date_to (YYYY-MM-DD), page (domyślnie 1), limit (domyślnie 50, max 100), sort_by (expense_date|created_at|amount_cents), sort_order (asc|desc).
- Walidacja: Zod schema dla query z domyślnymi wartościami i ograniczeniami (limit ≤ 100, page ≥ 1, sort_by z whitelist, sort_order ∈ {asc, desc}, daty zgodne z YYYY-MM-DD, participant_id/settlement_id zgodne z UUIDv4); błędy walidacji → 400.
- Autoryzacja: Wymagany kontekst użytkownika z Supabase w handlerze, następnie zapytania kierowane do tabel przez Supabase JS API podlegają RLS; brak sesji → 401.
- Cache po stronie klienta: odpowiedź zawiera ETag, aby umożliwić warunkowe GET z If-None-Match i odpowiedzi 304 Not Modified przy braku zmian.

Przykładowy szkic walidacji w handlerze:

```ts
// src/pages/api/settlements//expenses.ts
import type { APIRoute } from "astro";
import { z } from "zod";
import { getExpenses } from "@/lib/services/expenses.service";

const QuerySchema = z.object({
  participant_id: z.string().uuid().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort_by: z.enum().default("expense_date"),
  sort_order: z.enum().default("desc"),
});
```

### Szczegóły odpowiedzi

- Kod powodzenia: 200 z treścią JSON zawierającą pole data (tablica ExpenseDTO) i pagination (page, limit, total, total_pages) zgodnie z kontraktami typu ExpensesListResponse.
- Nagłówki: Content-Type: application/json; ETag: "<hash treści>"; Cache-Control: private, no-store lub krótkie max-age=0 + revalidacja warunkowa, aby nie buforować danych użytkownika po stronie współdzielonych cache.
- Obsługa 304: jeśli If-None-Match pasuje do obecnego ETag, zwróć 304 bez ciała i oszczędź transfer, co jest zalecane dla GET.

### Przepływ danych

- Wejście: Astro GET handler odczytuje params i query, waliduje Zod, uzyskuje Supabase client z kontekstu i identyfikację użytkownika.
- Logika: Warstwa service buduje zapytanie do Supabase z filtrami (participant jako płacący lub uczestnik przez join), zakresem dat, sortowaniem, oraz paginacją z limit/offset, zgodnie z parametrami wejściowymi.
- Mapowanie: Serwis zwraca rekordy złączone z expense_participants i participants, po czym mapuje do ExpenseDTO z participants: oraz metadany paginacji.
- Wyjście: Handler serializuje odpowiedź, ustawia Content-Type i ETag, i zwraca Response 200 lub 304 przy trafieniu walidatora, z bezpiecznymi nagłówkami cache.

### Względy bezpieczeństwa

- Autentykacja i autoryzacja: wymagane logowanie w Supabase Auth oraz włączone RLS na tabelach expenses, expense_participants i participants/settlements, aby egzekwować izolację danych na poziomie wiersza.
- Ochrona przed IDOR: sprawdzenie, że settlement_id i participant_id należą do przestrzeni rozliczeń użytkownika przed budową zapytania, mimo RLS, dla czytelnych kodów błędów i redukcji wycieków szczegółów.
- Brak ujawniania szczegółów: w komunikatach błędów nie ujawniać, czy zasób istnieje, jeśli użytkownik nie ma uprawnień; preferować 404 dla nieistniejącego lub niedostępnego rozliczenia, w zależności od polityki produktowej.
- Edge i rate limiting: wykorzystać Cloudflare do egzekwowania reguł rate limiting/WAF i ewentualnej ochrony DDoS, z właściwymi nagłówkami cache, aby nie buforować danych prywatnych.

### Obsługa błędów

- 400 Bad Request: błędne UUID, zakres dat, limit>100, nieobsługiwane sort_by/sort_order, lub niespójne parametry; treść zawiera kod błędu i szczegóły walidacji.
- 401 Unauthorized: brak sesji użytkownika w Supabase/locals; nie zwracać żadnych danych domenowych.
- 403 Forbidden: użytkownik uwierzytelniony, lecz polityki RLS/prawa dostępu odrzucają zapytanie dla danego settlement_id/participant_id.
- 404 Not Found: rozliczenie nie istnieje lub nie jest dostępne dla użytkownika zgodnie z polityką „nie ujawniaj istnienia zasobów”.
- 500 Internal Server Error: nieoczekiwany błąd po stronie serwera/bazy; logować szczegóły techniczne wewnętrznie, a klientowi zwracać ogólny komunikat.
- 304 Not Modified: gdy klient przedstawia pasujący If-None-Match; brak ciała odpowiedzi.
- 429 Too Many Requests: przy limitowaniu na krawędzi z Cloudflare wskazane ustawienie Retry-After.

Szkic jednolitego formatu błędów:

```json
{
  "error": {
    "code": "validation_error|unauthorized|forbidden|not_found|server_error",
    "message": "Czytelny, bezpieczny komunikat",
    "details": { "field": "limit", "reason": "must be <= 100" }
  }
}
```

### Wydajność

- Paginacja z limitem do 100 rekordów minimalizuje rozmiar odpowiedzi i obciążenie bazy, co jest typowe dla stabilnych API GET.
- Redukcja N+1: pobieranie participants dla expenses przez jedno złączenie/aggregację po stronie bazy/serwisu zamiast wielu wywołań sieciowych.
- Revalidacja warunkowa: ustawienie ETag i obsługa If-None-Match pozwala znacząco zmniejszyć transfer przy powtórnych żądaniach, a Cache-Control steruje brakiem buforowania w publicznych cache.
- Edge: Cloudflare może skracać opóźnienia sieciowe dla zasobów, które można bezpiecznie revalidować na krawędzi, choć odpowiedzi użytkownika powinny być oznaczone jako private/no-store.

### Kroki implementacji

- Utwórz plik endpointu: src/pages/api/settlements//expenses.ts z eksportem GET i export const prerender = false zgodnie z wytycznymi dla serwerowych endpointów Astro.
- Zdefiniuj Zod schemas: QuerySchema zgodnie z kontraktem, z domyślnymi wartościami i limitami; walidacja na początku handlera, błędy → 400.
- Pobierz kontekst Supabase: użyj Supabase client z locals w handlerze, pobierz użytkownika/sesję i w przypadku braku sesji zwróć 401.
- Warstwa serwisowa: dodaj src/lib/services/expenses.service.ts z funkcją getExpenses(ctx, { settlement_id, ...query }) budującą zapytanie do Supabase (filtr po settlement_id, participant jako payer lub uczestnik, zakres dat, sort, paginacja), zwracającą dane i total.
- Mapowanie do DTO: w serwisie zmapuj rekordy do ExpenseDTO i policz metadane paginacji (page, limit, total, total_pages).
- ETag i nagłówki: oblicz hash treści JSON (np. stable stringify) jako ETag, obsłuż If-None-Match → 304, ustaw Content-Type i bezpieczne Cache-Control.
- Obsługa błędów: przechwyć błędy walidacji, autoryzacji (RLS/permission), oraz niespodziewane wyjątki i zwróć odpowiednie kody 400/401/403/404/500 w ujednoliconym formacie.
- Logowanie: zapisuj strukturalne logi serwerowe z identyfikatorem żądania i minimalnym kontekstem, bez danych wrażliwych; integracja z pipeline CI/CD bez ujawniania szczegółów użytkownikowi.
- Edge i czyszczenie cache: skonfiguruj zasady Cloudflare (no-store/private dla danych użytkownika) i upewnij się, że 304 działa poprawnie dla revalidacji klienta.

Przykładowy szkic handlera:

```ts
// src/pages/api/settlements//expenses.ts
import type { APIRoute } from "astro";
import { z } from "zod";
import { getExpenses } from "@/lib/services/expenses.service";

export const prerender = false;

const QuerySchema = z.object({
  participant_id: z.string().uuid().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort_by: z.enum().default("expense_date"),
  sort_order: z.enum().default("desc"),
});

export const GET: APIRoute = async (ctx) => {
  const settlement_id = ctx.params.settlement_id!;
  const parse = QuerySchema.safeParse(Object.fromEntries(new URL(ctx.request.url).searchParams));

  if (!parse.success) {
    return new Response(
      JSON.stringify({ error: { code: "validation_error", message: "Invalid query", details: parse.error.flatten() } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // auth/session from locals (pseudo)
  const supabase = ctx.locals.supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Unauthorized" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  const result = await getExpenses({ supabase, user }, { settlement_id, ...parse.data });

  const body = JSON.stringify(result);
  const etag = `"W/${await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )}"`;
  const inm = ctx.request.headers.get("If-None-Match");
  if (inm && inm === etag) return new Response(null, { status: 304 });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "private, no-store",
    },
  });
};
```
