<analysis>
- Kluczowe punkty specyfikacji: Endpoint GET /settlements/{settlement_id}/expenses/{id} zwraca pojedynczy wydatek wraz z uczestnikami, struktura odpowiedzi jest identyczna jak element listy GET, a kody odpowiedzi to 200 (OK), 401 (Unauthorized), 403 (Forbidden) i 404 (Not Found) zgodnie z REST i wymogiem serwera SSR dla Astro API routes, gdzie zwracany jest obiekt Response ze statusem i nagłówkami oraz wymuszonym prerender=false dla tras SSR w Astro.
- Wymagane i opcjonalne parametry: Wymagane są parametry ścieżki settlement_id i id, a żadne parametry zapytania nie są przewidziane, natomiast nagłówki autoryzacji są wymagane do rozróżnienia 401 vs 403 i obsłużenia kontekstu RLS w Supabase, gdzie RLS działa jako implicitne WHERE na każdej tabeli i wymaga polityk dla SELECT oraz roli authenticated/anon.
- Niezbędne typy: ExpenseDetailsDTO (tożsame z ExpenseDTO) zagnieżdża participants: ExpenseParticipantMiniDTO, a identyfikatory i wartości liczbowe bazują na UUID oraz AmountCents, co odpowiada zwracaniu JSON w Astro API endpoints poprzez Response, gdzie definiuje się serializację i nagłówki Content-Type.
- Ekstrakcja logiki do service: Logika odczytu powinna trafić do src/lib/services/expenses.service.ts jako funkcja readExpenseWithParticipants(supabase, settlementId, expenseId), a warstwa API w src/pages/api/settlements//expenses/.json.ts ogranicza się do walidacji wejścia, autoryzacji i mapowania błędów HTTP, spójnie z rozdzieleniem endpointów i serwisu zalecanym przy budowie API routes w SSR Astro.
- Walidacja wejścia: Walidować paramy ścieżki jako UUID oraz dopuszczalny format daty w modelu (choć brak query), używając Zod na poziomie endpointu, a w bazie polegać na RLS i constraintach Postgres, przy czym polityki RLS należy mieć aktywne i selektywne (TO authenticated) oraz indeksować kolumny używane w politykach dla wydajności.
- Rejestrowanie błędów: W przypadku błędów serwerowych zwracać 500 i logować do systemu logów aplikacji oraz ewentualnej tabeli błędów, ale nigdy nie ujawniać szczegółów polityk RLS czy danych wrażliwych w odpowiedzi, korzystając z możliwości ustawiania statusu w Response w SSR.
- Zagrożenia bezpieczeństwa: Głównym ryzykiem jest niewłaściwe skonfigurowanie RLS (np. brak TO authenticated, brak USING/with check) oraz użycie service key, który omija RLS, a także brak weryfikacji przynależności expense i participantów do danego settlementu, dlatego należy wzmocnić RLS i nie używać kluczy serwisowych w ścieżce żądań użytkowników.
- Scenariusze błędów i kody: 401 przy braku sesji (auth.uid() jest null), 403 gdy użytkownik nie ma uprawnień zgodnie z politykami RLS, 404 gdy resource nie istnieje lub jest niewidoczny przez RLS, oraz 500 dla nieoczekiwanych wyjątków, z mapowaniem statusu przez Response w Astro API routes.
</analysis>

# .ai/view-implementation-plan.md

### Przegląd punktu końcowego

- Cel: Pobranie pojedynczego wydatku wraz z listą uczestników podziału z danego rozliczenia, z odpowiedzią zgodną ze strukturą elementu listy ExpensesListResponse (ExpenseDTO/ExpenseDetailsDTO) w formacie JSON zwróconym jako Response z poprawnym statusem HTTP w SSR Astro.
- Ścieżka: GET /settlements/{settlement_id}/expenses/{id}, obsłużona przez plik src/pages/api/settlements//expenses/.json.ts z export const prerender = false, aby endpoint był wykonywany on-demand po stronie serwera.
- Kody statusu: 200 przy sukcesie, 401 przy braku autoryzacji, 403 przy braku uprawnień, 404 gdy rekord nie istnieje lub jest niedostępny przez RLS, 500 dla błędów nienadzorowanych, przy czym Response w Astro pozwala jawnie ustawić kod i nagłówki.

### Szczegóły żądania

- Parametry ścieżki: settlement_id (UUID) i id (UUID), które są walidowane po stronie API za pomocą schematów wejściowych i odrzucone kodem 400 w razie nieprawidłowości przed dotknięciem warstwy danych, co minimalizuje koszty zapytania i ułatwia spójne mapowanie błędów.
- Nagłówki: Authorization: Bearer <JWT> wymagany do sesji Supabase Auth, ponieważ auth.uid() zwraca null bez uwierzytelnienia, co implikuje 401 przy braku użytkownika oraz wpływa na polityki RLS wywoływane dla roli anon vs authenticated.
- Body: Brak ciała w GET, jedynie odczyt danych i ich serializacja do JSON poprzez Response, zgodnie z modelem SSR endpointów Astro.

### Szczegóły odpowiedzi

- Format: JSON z polami ExpenseDetailsDTO obejmującymi id, payer_participant_id, amount_cents, expense_date, description, share_count, created_at, updated_at, last_edited_by oraz participants: ExpenseParticipantMiniDTO z id i nickname, zwracany przez Response z odpowiednim Content-Type.
- Idempotencja: GET jest bezskutkowe na stan i może być buforowane na kliencie/pośrednikach, jednak RLS i uprawnienia muszą być honorowane, a ewentualne nagłówki kontrolujące cache mogą być ustawione w Response, jeśli przewidujemy kontrolę cache.
- Spójność: Wynik powinien być spójny z listą GET /settlements/{id}/expenses, ponieważ wskazano, że struktura pojedynczego zasobu jest tożsama ze strukturą elementu listy, co upraszcza konsumpcję po stronie frontendu.

### Przepływ danych

- Wejście do endpointu: Żądanie HTTP trafia do SSR Astro API route, gdzie obsługa metody GET realizuje walidację parametrów, ekstrakcję sesji i wywołanie serwisu domenowego, po czym tworzy Response ze statusem i JSON, zgodnie z przewodnikiem Astro Endpoints.
- Warstwa serwisu: Serwis expenses.service.ts otrzymuje supabase z locals, settlementId oraz expenseId i wykonuje dwa zapytania: odczyt wydatku ograniczonego settlement_id oraz dołączenie uczestników przez tabelę łączącą, z przefiltrowaniem przez RLS, która działa jak implicitne WHERE w politykach.
- Baza i RLS: Polityki RLS na expenses, expense_participants i participants ograniczają widoczność wierszy do użytkowników należących do rozliczenia lub właściciela, a brak dopasowania skutkuje brakiem wyników i finalnie 404 w API, przy czym należy używać to authenticated oraz korzystać z auth.uid() w USING/with check.

### Względy bezpieczeństwa

- RLS must-have: Włączone RLS na publicznych tabelach i precyzyjne polityki SELECT dla expenses, expense_participants i participants, z użyciem TO authenticated, USING z auth.uid() i unikaniem polegania na metadanych JWT modyfikowalnych przez użytkownika, co zapewnia obronę w głąb.
- Klucze serwisowe: Bezwzględny zakaz używania service key w kontekście żądań użytkowników, gdyż bypass RLS omija wszystkie polityki, a serwisowe role służą wyłącznie do zadań administracyjnych poza ścieżką użytkownika.
- SSR i nagłówki: W API routes należy ustawiać właściwe nagłówki i statusy w Response, unikać ujawniania szczegółów polic, a w przypadku błędów zwracać neutralne komunikaty, pamiętając że SSR daje pełny dostęp do Request i umożliwia kontrolę odpowiedzi.

### Obsługa błędów

- 400 Bad Request: Zwracany przy niepoprawnym UUID w settlement_id lub id po walidacji wejścia w warstwie endpointu, zanim wykonane zostanie zapytanie do bazy, co ogranicza koszty i ryzyko informacji zwrotnej o schemacie.
- 401 Unauthorized: Zwracany, jeśli brak ważnego JWT, gdyż auth.uid() będzie null i polityki RLS nie dopuszczą dostępu, zatem brak sesji skutkuje odrzuceniem bez analizy zasobu.
- 403 Forbidden: Zwracany, gdy użytkownik jest uwierzytelniony, ale polityki RLS nie pozwalają na odczyt danego settlementu/expense, co zapewnia domknięcie zasadu najmniejszych uprawnień.
- 404 Not Found: Zwracany, gdy wydatek nie istnieje w danym settlement albo jest niewidoczny przez RLS, co zapobiega ujawnianiu istnienia zasobu poza zakresem uprawnień, w zgodzie z praktyką API i SSR Response.
- 500 Internal Server Error: Zwracany dla nieoczekiwanych wyjątków, po zalogowaniu błędu do systemu logowania i ewentualnie tabeli błędów, bez ujawniania detali, z kontrolą statusu via Response.

### Wydajność

- Minimalizacja round-trip: Pojedynczy read z dołączeniem uczestników może być zrealizowany poprzez dwa lekkie zapytania zamiast wielu per uczestnik, przy czym filtry po kluczach (id, settlement_id) są wspierane przez indeksy i przyspieszają plany zapytań pod RLS.
- Indeksy pod RLS: Zaleca się indeksowanie kolumn używanych w USING/with check (np. owner_id lub relacyjnych odniesień), gdyż Supabase rekomenduje indeksy na kolumnach wykorzystywanych przez polityki dla znaczących zysków wydajności.
- SSR operacje: SSR pozwala kontrolować nagłówki i ewentualne cache-control, ale należy pamiętać, że każde wywołanie przechodzi przez polityki RLS, co eliminuje konieczność dodatkowego filtrowania po stronie aplikacji.

### Kroki implementacji

- Pliki i struktura: Utworzyć endpoint w src/pages/api/settlements//expenses/.json.ts z export const prerender = false oraz typowanym handlerem GET zwracającym Response, zgodnie z dokumentacją Astro Endpoints.
- Walidacja i typy: Zaimplementować walidację parametrów ścieżki jako UUID oraz mapowanie do DTO, a następnie serializację JSON w Response z Content-Type, przy czym walidacja odbywa się zanim wywołamy serwis i bazę.
- Warstwa serwisu: Dodać src/lib/services/expenses.service.ts z funkcją readExpenseWithParticipants(supabase, settlementId, expenseId), która wykona bezpieczne odczyty z uwzględnieniem RLS i przekształci dane do ExpenseDetailsDTO, trzymając logikę poza endpointem.
- Supabase i RLS: Upewnić się, że RLS jest włączone na tabelach expenses, expense_participants i participants, dodać polityki SELECT z TO authenticated i USING opartym o auth.uid(), a także rozważyć indeksy kolumn wykorzystywanych w politykach.
- Obsługa błędów: Zaimplementować mapowanie wyjątków na 400/401/403/404/500 oraz neutralne treści komunikatów w JSON, pamiętając że Response pozwala jawnie ustawić status i nagłówki w SSR.
- Testy i scenariusze: Zweryfikować przypadki autoryzacji (brak tokenu → 401, brak uprawnień → 403), przypadki danych (brak wpisu lub niewidoczny przez RLS → 404) oraz poprawny odczyt → 200, a także testy wydajnościowe pod RLS i indeksy.
- Produkcja: Upewnić się, że żadne service key nie są używane w ścieżce użytkownika i że polityki są restrykcyjne, a SSR endpointy mają wyłączone prerenderowanie, zapewniając wykonywanie logiki on-demand.

### Implementacja – szkic techniczny

- Lokalizacja pliku endpointu:
  - src/pages/api/settlements//expenses/.json.ts z export const prerender = false oraz export async function GET(ctx) zwracającym Response(JSON.stringify(dto), { status: 200, headers: { 'Content-Type': 'application/json' }}) zgodnie z SSR endpoints w Astro.

- Walidacja parametrów:
  - Walidować ctx.params.settlement_id i ctx.params.id jako UUID, w przypadku błędu zwrócić Response z 400 i komunikatem JSON oraz Content-Type ustawionym explicite, przed jakimkolwiek dostępem do supabase.

- Pozyskanie klienta Supabase:
  - Używać klienta dostępnego w locals kontekstu serwera Astro i przekazać go do serwisu, zachowując podejście SSR i separację concerns, bez użycia klucza serwisowego.

- Serwis readExpenseWithParticipants:
  - Zapytanie 1: SELECT \* FROM expenses WHERE id = :id AND settlement_id = :settlement_id LIMIT 1, co zostanie dodatkowo ograniczone przez polityki RLS i role authenticated/anon.
  - Zapytanie 2: SELECT p.id, p.nickname FROM expense_participants ep JOIN participants p ON p.id = ep.participant_id AND p.settlement_id = ep.settlement_id WHERE ep.expense_id = :id AND ep.settlement_id = :settlement_id, z RLS ograniczającym widoczność i koniecznością indeksów dla kolumn w politykach.
  - Mapowanie: Złożyć wynik do ExpenseDetailsDTO i zwrócić do warstwy API, aby sformatować Response.

- Mapowanie błędów:
  - 401 gdy brak sesji lub kontekstu użytkownika i auth.uid() jest null, 403 gdy zapytanie jest zablokowane przez politykę, 404 gdy rekord nie istnieje lub nie jest dostępny po filtrach i RLS, 500 dla wyjątków serwisowych, z czystymi komunikatami i bez detali technicznych.

- Usprawnienia DB i RLS:
  - Zweryfikować, że RLS jest enable row level security na każdej tabeli i polityki SELECT używają TO authenticated i (select auth.uid()) idiomu dla optymalizacji planu, a kolumny użyte w politykach są zindeksowane dla lepszych czasów odpowiedzi.

- Deferrable constraints i triggery:
  - Utrzymanie spójności share_count oraz minimalnej liczby uczestników jest zapewnione triggerami i constraintami w bazie, a rozumienie DEFERRABLE/INITIALLY DEFERRED ma znaczenie przy operacjach modyfikujących, choć GET ich nie wyzwala, co warto uwzględnić przy debugowaniu consistencji.

- Finalizacja:
  - Dodać testy integracyjne z realnym RLS, sprawdzić odpowiedzi i kody HTTP, oraz wdrożyć w środowisku z SSR, gdzie endpointy działają on-demand z prawidłowym Response i nagłówkami.
