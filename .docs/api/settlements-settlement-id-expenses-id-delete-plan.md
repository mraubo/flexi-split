Poniżej znajduje się analiza oraz kompletny plan wdrożenia punktu końcowego DELETE /settlements/{settlement_id}/expenses/{id} zgodny z Astro API Routes, Supabase RLS i walidacją Zod.
Plan uwzględnia semantykę 204 No Content dla operacji DELETE oraz integrację Supabase w Astro middleware przez context.locals.

<analysis>
1) Kluczowe punkty specyfikacji API: Endpoint DELETE /settlements/{settlement_id}/expenses/{id} ma usuwać wydatek tylko gdy rozliczenie ma status=open, zwraca pustą odpowiedź z kodem 204 No Content, a błędy to 401, 403, 404 oraz 422 w przypadku rozliczenia zamkniętego.
2) Parametry: Wymagane parametry ścieżki to settlement_id oraz id, brak ciała żądania i brak parametrów zapytania, a autoryzacja odbywa się przez sesję Supabase/SSR i middleware udostępniające klienta w context.locals.
3) DTO/Command: Brak ciała żądania oraz brak treści odpowiedzi, natomiast do walidacji parametrów stosujemy Zod z typami string/uuid i ewentualnie scalone typy wspólne, które już istnieją w projekcie, przy czym Zod zapewnia runtime validation i typowanie w TS.
4) Ekstrakcja logiki do service: Logika domenowa usuwania powinna trafić do warstwy service w src/lib/services/expenses.service.ts, a endpoint jedynie rozwiązuje autoryzację i deleguje do serwisu, co dobrze wpisuje się w wzorce API Routes w Astro oraz utrzymanie zależności przez middleware i locals.
5) Walidacja wejścia: Walidujemy settlement_id i id jako UUID z Zod, a semantykę domenową (czy rozliczenie jest open i czy wydatek należy do rozliczenia i jest dostępny dla aktora) egzekwujemy w bazie przez RLS/polityki DELETE oraz zapytania z ograniczeniami, zachowując semantykę 204 No Content dla powodzenia i właściwe kody w pozostałych przypadkach.
6) Rejestrowanie błędów: Krytyczne błędy i decyzje autoryzacyjne można logować w dedykowanej tabeli audytowej lub przez mechanizmy audytu/triggerów Postgres, a dodatkowo korzystać z logów Supabase dla inspekcji produkcyjnej.
7) Zagrożenia bezpieczeństwa: Niewłaściwe skonfigurowanie RLS dla DELETE, brak powiązania użytkownika z rozliczeniem, wycieki kluczy serwisowych oraz brak SSR-cookie klienta supabase stanowią ryzyko, a mitigacją są ścisłe polityki RLS, SSR client z cookies i middleware do wstrzykiwania klienta do locals.
8) Scenariusze błędów: 401 gdy brak sesji, 403 gdy polityka RLS odmawia lub użytkownik nie jest uczestnikiem/właścicielem, 404 gdy zasób nie istnieje lub nie należy do rozliczenia, 422 gdy rozliczenie jest zamknięte, oraz 500 dla błędów serwera, przy czym DELETE pozostaje idempotentne i 204 oznacza skuteczne usunięcie bez treści.
</analysis>

### Przegląd punktu końcowego
Endpoint służy do usuwania wydatku w ramach rozliczenia i zwraca 204 No Content bez ciała odpowiedzi, co jest zgodne z semantyką HTTP dla powodzenia operacji DELETE bez dodatkowych danych w odpowiedzi.
Operacja jest dozwolona wyłącznie, gdy rozliczenie ma status open, a egzekwowanie tej reguły powinno być utrzymane w warstwie bazy poprzez polityki RLS i ograniczenia transakcyjne dla bezpieczeństwa i spójności.

### Szczegóły żądania
- Metoda i ścieżka: DELETE /settlements/{settlement_id}/expenses/{id}, implementowana jako plik API Route w Astro pod odpowiednią ścieżką plików, co umożliwia serwerową obsługę żądań i pełny dostęp do middleware.
- Parametry: Wymagane parametry ścieżki to settlement_id i id, które należy zwalidować jako UUID za pomocą Zod dla bezpieczeństwa i poprawności typów w runtime.
- Autoryzacja: Wymagana aktywna sesja użytkownika, dostarczana do endpointu przez middleware i SSR Supabase client skonfigurowany z cookies, a klient jest dostępny przez context.locals.
- Body i query: Brak ciała żądania i brak parametrów zapytania, ponieważ operacja dotyczy jednoznacznie zidentyfikowanego zasobu i powinna być idempotentna w granicach modelu REST.

### Szczegóły odpowiedzi
- Sukces: 204 No Content bez ciała, co potwierdza skuteczne usunięcie i pozwala uniknąć zbędnego przesyłu danych po stronie klienta.
- Nagłówki: Standardowe nagłówki odpowiedzi HTTP mogą obejmować datę i identyfikację serwera, ale nie powinny zawierać Content-Length ani ciała, zgodnie z wymogami 204.

### Przepływ danych
- Middleware: Żądanie trafia do Astro middleware, które wstrzykuje do context.locals serwerowego klienta Supabase SSR związanego z sesją na cookies, co umożliwia bezpieczną autoryzację i przekazanie klienta do handlera API.
- Handler: API Route w pliku src/pages/api/settlements//expenses/.ts eksportuje funkcję DELETE, która parsuje parametry, sprawdza autoryzację i deleguje logikę do warstwy service, zachowując czystość i testowalność kodu.
- Warstwa service: Serwis wykonuje w jednej transakcji walidację statusu rozliczenia oraz próbę usunięcia wydatku ograniczoną do wskazanego settlement_id i id, polegając na politykach RLS i ograniczeniach bazy dla egzekwowania uprawnień i spójności, a następnie zwraca wynik dla mapowania kodów statusu.
- Triggery i spójność: Utrzymanie liczników oraz zależności N:M może być kontrolowane triggerami i ograniczeniami w bazie, co jest zgodne z praktyką budowania spójności warstwy danych w Postgres poprzez mechanizmy triggerów i transakcji.

### Względy bezpieczeństwa
- RLS i DELETE: Należy zdefiniować polityki RLS dla tabel expenses i expense_participants pozwalające na DELETE wyłącznie użytkownikowi należącemu do rozliczenia oraz zgodnie z regułą status='open', co zamyka klasę ataków polegających na nieautoryzowanym usunięciu zasobów.
- SSR i ciasteczka: Użycie klienta Supabase SSR z cookies w middleware zapobiega ekspozycji kluczy serwisowych i zapewnia, że autoryzacja odbywa się na serwerze, co wzmacnia kontrolę dostępu i minimalizuje powierzchnię ataku.
- Izolacja uprawnień: Upewnij się, że endpoint nie korzysta z service role na żądaniach użytkownika i że polityki RLS są włączone i przetestowane, aby wymusić najmniejsze możliwe uprawnienia dla każdej operacji.

### Obsługa błędów
- 401 Unauthorized: Brak sesji lub tokenu sesji w cookies powoduje odpowiedź 401, co jest standardowym odwzorowaniem braku uwierzytelnienia w API.
- 403 Forbidden: Użytkownik jest uwierzytelniony, lecz polityka RLS odmawia DELETE lub użytkownik nie jest powiązany z rozliczeniem, co uzasadnia 403 zgodnie z kontrolą autoryzacji po stronie bazy.
- 404 Not Found: Wydatek nie istnieje lub nie należy do wskazanego rozliczenia, a ujawnianie szczegółów jest niewskazane, więc 404 jest właściwym kodem przy braku możliwości potwierdzenia obecności zasobu.
- 422 Unprocessable Entity: Rozliczenie ma status closed i operacja biznesowo jest niedozwolona, dlatego 422 sygnalizuje poprawnie zbudowane żądanie niespełniające reguł domenowych, a nie błąd składni żądania.
- 500 Internal Server Error: Niespodziewane błędy bazy, transakcji lub wewnętrzne wyjątki serwera odwzorować jako 500 i zarejestrować w telemetrii/logach, aby umożliwić diagnostykę produkcyjną.

### Wydajność
- Jedna transakcja: Realizuj weryfikację i usunięcie w jednej transakcji, aby uniknąć dodatkowych round-tripów i zapewnić atomowość, korzystając z serwerowego klienta i ograniczeń bazy dla szybkiego pathu, co jest zgodne z dobrymi praktykami API Routes.
- Bez treści odpowiedzi: Użycie 204 No Content zmniejsza payload i skraca czas odpowiedzi po stronie klienta, co jest właściwe dla operacji idempotentnych DELETE.
- Autoryzacja w bazie: Delegowanie autoryzacji do RLS skraca ścieżkę aplikacyjną i pozwala optymalizatorowi Postgresa stosować właściwe plany, co sprzyja wydajności przy rosnącej liczbie reguł.

### Kroki implementacji
1) Middleware i klient SSR: Utwórz src/middleware/index.ts z onRequest, zainicjalizuj Supabase SSR client z cookies i umieść go w context.locals, aby endpointy i strony miały dostęp do uwierzytelnionego klienta na serwerze.
2) Struktura pliku endpointu: Dodaj plik src/pages/api/settlements//expenses/.ts i zaimplementuj export const DELETE, zgodnie ze wzorcem Astro API Routes dla metod HTTP w nazwach eksportów.
3) Walidacja parametrów: Zdefiniuj Zod schema dla params { settlement_id: z.string().uuid(), id: z.string().uuid() } i parsuj params z APIContext, aby wczesnym zwrotem odpowiadać 400 w razie nieprawidłowych identyfikatorów.
4) Warstwa service: Stwórz src/lib/services/expenses.service.ts z funkcją deleteExpense(settlementId, expenseId, actor) wykonującą transakcję usunięcia z ograniczeniem do pary (settlement_id, id) oraz kontrolą statusu open przez zapytanie lub politykę RLS/constraint, zwracając wynik do mapowania kodu odpowiedzi.
5) Polityki RLS: Włącz RLS i dodaj polityki DELETE dla expenses oraz powiązanych N:M tak, aby usuwać tylko w ramach rozliczeń, do których użytkownik należy oraz gdy status rozliczenia jest open, co wymusza bezpieczeństwo na poziomie bazy.
6) Mapowanie kodów: Zaimplementuj mapowanie 204 dla powodzenia, 401 przy braku sesji, 403 przy odmowie RLS, 404 dla braku zasobu i 422 dla closed settlement, zgodnie z semantyką HTTP i praktykami REST dla DELETE.
7) Logowanie i audyt: Zapisuj błędy serwerowe i decyzyjne do logów Supabase oraz rozważ audyt SQL przez dedykowane triggery/tabelę audytową dla krytycznych operacji usuwania, co ułatwi analizę incydentów.
8) Testy i CI: Przygotuj zestaw testów integracyjnych obejmujących ścieżki sukcesu, brak sesji, brak uprawnień, brak zasobu i rozliczenie zamknięte, a w CI uruchamiaj je na GitHub Actions oraz monitoruj logi w środowiskach, aby zapewnić stabilność wdrożenia.
9) Zapis planu: Zapisz ten plan jako plik .ai/view-implementation-plan.md w repozytorium, aby był jednoznacznym źródłem wytycznych dla zespołu i mógł być versionowany z kodem projektu.

#### Szkic kodu endpointu (skrót)
Poniższy szkic jest poglądowy i zakłada obecność klienta Supabase SSR w Astro.locals oraz walidacji Zod w module współdzielonym, co integruje się z Astro API Routes i middleware locals:

```ts
// src/pages/api/settlements//expenses/.ts
import type { APIRoute } from "astro";
import { z } from "zod";
const ParamsSchema = z.object({
  settlement_id: z.string().uuid(),
  id: z.string().uuid(),
});

export const DELETE: APIRoute = async (ctx) => {
  const supabase = ctx.locals.supabase; // wstrzyknięty w middleware
  if (!supabase) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  const parse = ParamsSchema.safeParse(ctx.params);
  if (!parse.success) {
    return new Response(JSON.stringify({ error: "bad_request" }), { status: 400 });
  }
  const { settlement_id, id } = parse.data;

  // delegacja do service
  const result = await ctx.locals.services.expenses.deleteExpense(settlement_id, id, ctx.locals.user);
  if (result.type === "not_found") return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  if (result.type === "forbidden") return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  if (result.type === "closed") return new Response(JSON.stringify({ error: "unprocessable_entity" }), { status: 422 });
  if (result.type === "ok") return new Response(null, { status: 204 });
  return new Response(JSON.stringify({ error: "internal_error" }), { status: 500 });
};
```

Ten szkic odzwierciedla podział odpowiedzialności między walidacją wejścia, autoryzacją w oparciu o SSR i RLS, a mapowaniem wyników serwisu domenowego na kody HTTP, zgodnie z dokumentacją Astro API Routes, Zod i semantyką 204 dla DELETE.