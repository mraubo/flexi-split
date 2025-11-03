Poniżej znajduje się kompletny, praktyczny plan wdrożenia punktu końcowego POST /settlements zgodny z przekazaną specyfikacją, stosami technologicznymi oraz zasadami implementacji projektu, z naciskiem na poprawną walidację, bezpieczeństwo (RLS, middleware), poprawne kody statusu i integrację z Astro API Routes oraz Supabase Auth i DB Triggers.

<analysis>
1) Kluczowe punkty specyfikacji API: endpoint POST /settlements tworzy nowe rozliczenie, przyjmuje body z polem title (string, max 100, required), zwraca strukturę jak GET /settlements item (SettlementSummaryDTO/DetailsDTO), sukces 201 Created, błędy 400 dla walidacji danych, 401 dla braku autoryzacji, 422 gdy użytkownik ma już 3 otwarte rozliczenia.
2) Parametry: wymagane body.title (string, max 100), opcjonalnych parametrów brak, nagłówki standardowe Content-Type: application/json, autoryzacja przez sesję Supabase w middleware i RLS po stronie DB.
3) DTO i Command: CreateSettlementCommand { title: string }, odpowiedź SettlementDetailsDTO (alias SummaryDTO) zawiera id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by, bez kolekcji zagnieżdżonych.
4) Logika w service: wydziel SettlementService z metodą create() przyjmującą validated payload, userId z Astro.locals, oraz korzystającą z Supabase RLS i DB constraints; w warstwie API wyłącznie parsing Zod, mapowanie błędów i statusów.
5) Walidacja: Zod schema dla body.title (required, string, max 100), odrzucanie nazw niezgodnych z limitem znaków, wymuszenie Content-Type application/json, mapowanie błędów Zod na 400; kontrola 401 przy braku userId w Astro.locals; 422 dla naruszenia biznesowego limitu 3 otwartych rozliczeń (egzekwowanego przez constraint trigger/DB policy).
6) Rejestrowanie błędów: w endpointzie loguj błędy serwera i nieprzewidziane wyjątki do centralnego loggera, a jeśli istnieje tabela błędów, zapisuj kod, ślad oraz korelację żądania; zachowaj minimalizm w treści odpowiedzi 500 dla klienta.
7) Zagrożenia bezpieczeństwa: brak weryfikacji autoryzacji w middleware może dopuścić tworzenie rozliczeń bez przypisanego ownera; brak RLS może pozwolić na tworzenie rekordów dla innego owner_id; brak triggerów lub deferrable constraints może ominąć limit „max 3 open settlements”; brak prawidłowych statusów może ujawniać szczegóły systemu.
8) Scenariusze błędów: 400 – puste lub >100 znaków w title; 401 – brak zalogowanego użytkownika; 422 – przekroczenie limitu 3 otwartych rozliczeń lub inny semantyczny konflikt; 500 – nieprzewidziany błąd serwera/komunikacji z DB.
</analysis>

# .ai/view-implementation-plan.md

### Przegląd punktu końcowego

- Cel: Utworzenie nowego rozliczenia dla zalogowanego użytkownika z domyślnymi polami i domyślnym statusem open, z walidacją tytułu i kontrolą limitu maksymalnie 3 otwartych rozliczeń po stronie DB i RLS.
- Metoda i ścieżka: POST /settlements jako Astro Server Endpoint w src/pages/api/settlements.ts z export const prerender = false oraz eksportem POST w stylu APIRoute.
- Autoryzacja: Wymagana sesja Supabase, userId udostępniony przez Astro middleware w context.locals, wykorzystywany w warstwie service i zabezpieczony RLS.
- Kody statusu: 201 dla pomyślnego utworzenia, 400 dla nieprawidłowych danych, 401 dla braku autoryzacji, 422 dla naruszenia reguł biznesowych (np. limit 3 otwartych), 500 dla błędów serwera.

### Szczegóły żądania

- Nagłówki: Content-Type: application/json oraz nagłówki autoryzacji dostarczane przez Supabase/Auth, konsumowane w middleware i przekazane przez Astro.locals.
- Body JSON:
  - Schema: title – string, required, max 100 znaków, walidowany przez Zod schema.safeParse, błędy mapowane do 400.
- Przykładowy Zod schema (w src/lib/validation/settlements.ts):

  ```ts
  import { z } from "zod";

  export const CreateSettlementSchema = z.object({
    title: z.string().min(1, "title is required").max(100, "max 100 chars"),
  });
  export type CreateSettlementInput = z.infer<typeof CreateSettlementSchema>;
  ```

- Integracja w Astro POST: wymuś obsługę tylko application/json, odrzuć inne media types lub brak body jako 400, a brak userId jako 401.

### Szczegóły odpowiedzi

- 201 Created: Body typu SettlementDetailsDTO (identyczny jak SummaryDTO) zawiera podstawowe pola rozliczenia bez zagnieżdżeń, w tym id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by.
- Format błędów:
  - 400: { error: "validation_error", details: { title: "..." } } dla błędów Zod.
  - 401: { error: "unauthorized" } gdy brak zalogowanego użytkownika z Astro.locals.
  - 422: { error: "business_rule_violation", code: "MAX_OPEN_SETTLEMENTS" } dla naruszeń constraint/trigger lub polityk RLS.
  - 500: { error: "internal_error", request_id?: string } dla nieprzewidzianych błędów.

### Przepływ danych

- Middleware: onRequest ustawia locals.supabase i locals.user (userId, e-mail), dostępne w każdym API Route przez APIContext.locals, dzięki czemu endpoint nie importuje globalnego klienta.
- Endpoint POST:
  - Parsuje JSON, waliduje Zod schema, weryfikuje obecność userId, a następnie deleguje do SettlementService.create(title, userId).
- Service:
  - Sprawdza po stronie DB możliwość utworzenia rekordu settlement z owner_id=userId oraz status='open' i domyślnymi wartościami; unikaj logiki policzalnych limitów w aplikacji, polegając na DB constraint trigger/deferrable enforcement i RLS.
- DB:
  - RLS wymusza, aby insert był możliwy tylko dla authenticated użytkownika i owner_id=auth.uid(), a constraint trigger/PL/pgSQL egzekwuje limit maks. 3 otwartych rozliczeń ownera.
- Odpowiedź:
  - Mapuj sukces do 201 z ujednoliconą strukturą DTO, a błędy Supabase/RLS/constraint do odpowiednich statusów 400/401/422/500.

### Względy bezpieczeństwa

- Autoryzacja w middleware: pobieranie sesji i userId, zablokowanie wykonania POST przy braku usera (401) zanim dojdzie do jakiejkolwiek interakcji z DB.
- RLS: enable row level security dla settlements i polityka INSERT z with check (auth.uid() = owner_id), aby uniemożliwić tworzenie rozliczeń dla innego użytkownika.
- DB Triggers/constraints: constraint trigger DEFERRABLE AFTER INSERT/UPDATE status, który w transakcji sprawdzi licznik otwartych i rzuci wyjątek, jeżeli użytkownik przekroczył 3 open settlements, co mapujemy na 422.
- Minimalizacja ujawnień: odpowiedzi błędów nie ujawniają szczegółów zapytań ani nazw funkcji/triggerów, a logi są odseparowane od treści odpowiedzi.

### Obsługa błędów

- 400 Bad Request: błędy Zod (min/max długości), niepoprawny Content-Type, niepoprawny JSON; zwróć szczegóły walidacji w polu details.
- 401 Unauthorized: brak sesji/userId w Astro.locals, brak nagłówków autoryzacyjnych; natychmiastowy zwrot bez prób inserta.
- 422 Unprocessable Entity: wyjątek z constraint trigger/unikalności/deferrable sprawdzający limit 3 otwartych rozliczeń – semantycznie poprawne żądanie, ale sprzeczne z regułą domenową.
- 500 Internal Server Error: nieprzewidziany błąd (np. błąd połączenia z DB); loguj szczegóły serwerowo, klientowi zwracaj uogólnioną odpowiedź.
- Rejestrowanie: użyj centralnego loggera serwerowego, a jeśli istnieje tabela błędów – zapisuj klasę błędu, stack, userId i korelację żądania, bez wrażliwych danych w treści HTTP.

### Wydajność

- Jeden insert bez dodatkowych round-tripów aplikacyjnych; polegaj na indeksach i triggerach DB do egzekwowania zasad zamiast wykonywania pre-checków w aplikacji.
- Astro API Route SSR: ogranicz serializację do minimalnego DTO i ustaw nagłówki Cache-Control=private, no-store dla odpowiedzi mutujących, aby uniknąć niepożądanych cache w edge.
- Middleware locals: inicjalizuj supabase klienta na żądanie i współdziel przez Astro.locals, aby unikać wielokrotnych inicjalizacji per endpoint.

### Kroki implementacji

- Pliki i struktura:
  - src/pages/api/settlements.ts – endpoint; export const prerender = false; eksport POST; używaj APIContext.locals.supabase i APIContext.locals.user.
  - src/lib/validation/settlements.ts – CreateSettlementSchema z Zod i typy inferowane.
  - src/lib/services/settlements.service.ts – SettlementService.create(input, userId) z jedyną odpowiedzialnością za wywołanie inserta w DB i mapowanie błędów.
  - src/middleware/index.ts – onRequest: uwierzytelnienie, załadowanie userId, wstrzyknięcie supabase do locals.
- Endpoint POST szkic:

  ```ts
  import type { APIRoute } from "astro";
  import { CreateSettlementSchema } from "@/lib/validation/settlements";
  export const prerender = false;

  export const POST: APIRoute = async (ctx) => {
    const user = ctx.locals.user;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    }

    let payload: unknown;
    try {
      payload = await ctx.request.json();
    } catch {
      return new Response(JSON.stringify({ error: "validation_error", details: { body: "invalid json" } }), {
        status: 400,
      });
    }

    const parsed = CreateSettlementSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "validation_error", details: parsed.error.flatten().fieldErrors }), {
        status: 400,
      });
    }

    try {
      const service = ctx.locals.services.settlements;
      const dto = await service.create({ title: parsed.data.title }, user.id);
      return new Response(JSON.stringify(dto), { status: 201 });
    } catch (e: any) {
      if (e?.code === "MAX_OPEN_SETTLEMENTS") {
        return new Response(JSON.stringify({ error: "business_rule_violation", code: "MAX_OPEN_SETTLEMENTS" }), {
          status: 422,
        });
      }
      if (e?.status === 401) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
      return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
    }
  };
  ```

- Service szkic:

  ```ts
  export class SettlementService {
    constructor(private supabase: any) {}
    async create(input: { title: string }, userId: string) {
      const { data, error } = await this.supabase
        .from("settlements")
        .insert([{ title: input.title, owner_id: userId }])
        .select(
          "id,title,status,currency,participants_count,expenses_count,created_at,updated_at,closed_at,last_edited_by"
        )
        .single();

      if (error) {
        // Mapuj kody błędów/komunikaty z DB/triggerów na znane business codes
        if (this.isMaxOpenSettlements(error)) {
          const e: any = new Error("max open settlements");
          e.code = "MAX_OPEN_SETTLEMENTS";
          throw e;
        }
        throw error;
      }
      return data;
    }
    private isMaxOpenSettlements(error: any) {
      return /max.*open.*settlements/i.test(error?.message ?? "");
    }
  }
  ```

- Middleware szkic:

  ```ts
  import type { MiddlewareHandler } from "astro:middleware";
  export const onRequest: MiddlewareHandler = async (ctx, next) => {
    // Inicjalizacja supabase klienta i usera, np. z cookies/JWT
    ctx.locals.supabase = /* create client for this request */;
    ctx.locals.user = /* get user from supabase auth */;
    ctx.locals.services = { settlements: new SettlementService(ctx.locals.supabase) };
    return next();
  };
  ```

- RLS i DB:
  - Włącz RLS na settlements i dodaj INSERT policy: with check (auth.uid() = owner_id), oraz SELECT policy odpowiednia dla właściciela, by odczytać świeżo wstawiony rekord.
  - Dodaj constraint trigger DEFERRABLE, który liczy open settlements ownera i rzuca wyjątek przy >3, co endpoint mapuje na 422 Unprocessable Entity.
- Testy:
  - Jednostkowe walidacji Zod dla title, testy integracyjne endpointu na 200/201/400/401/422, oraz test RLS/triggerów na ograniczenie do 3.

Zapisz plan jako .ai/view-implementation-plan.md i uwzględnij pokazane szkielety plików, aby zespół mógł rozpocząć implementację bez dalszych doprecyzowań.
