Plan analizy i wdrożenia endpointu GET /settlements/{id} znajduje się poniżej, przygotowany zgodnie z Astro API routes, Supabase SSR i RLS, oraz praktykami walidacji Zod i HTTP Semantics RFC 9110, a rezultat należy zapisać jako .ai/view-implementation-plan.md.

<analysis>
1) Kluczowe punkty specyfikacji API: Endpoint to GET /settlements/{id}, zwraca szczegóły pojedynczego rozliczenia w strukturze identycznej jak GET /settlements item, z kodami 200 oraz błędami 401, 403, 404 zgodnie z RFC 9110.

2. Parametry: Wymagany parametr ścieżki id jako UUID, brak query params, autoryzacja przez Supabase SSR cookies/session, a brak parametrów opcjonalnych po stronie zapytania.

3. Niezbędne DTO/Command modele: SettlementDetailsDTO jako alias SettlementSummaryDTO, oraz wspólne prymitywy UUID/TimestampString/AmountCents zgodnie z sekcją typów, bez dodatkowych Command modeli dla GET, a walidacja dotyczy jedynie path param id.

4. Ekstrakcja logiki do service: Utworzyć src/lib/services/settlements.service.ts z metodą getSettlementById oraz isAccessibleByUser, wykorzystując Supabase SSR client z locals i RLS, a w razie potrzeby funkcję pomocniczą SECURITY DEFINER do rozróżnienia 403 vs 404 bez ujawniania danych.

5. Walidacja danych wejściowych: Zod schema dla id (uuid) oraz mapowanie błędów na 400 przy nieprawidłowym UUID, a obsługa sesji bez cookies skutkuje 401, z poprawnym użyciem Astro API routes i export const prerender = false.

6. Rejestrowanie błędów: Logowanie strukturalne po stronie serwera oraz platformowe logi środowiska, a opcjonalnie zdarzenia audytowe w dedykowanym mechanizmie, unikając ujawnienia danych w logach i zgodnie z zasadami SSR/adaptera.

7. Zagrożenia bezpieczeństwa: BOLA na identyfikatorze {id} wymaga ścisłej autoryzacji na poziomie RLS i sprawdzania owner_id, CSRF zredukowane przez bezpieczne cookies SSR, oraz minimalizacja ekspozycji informacji przy 403/404 zgodnie z OWASP API Top 10 2023.

8. Scenariusze błędów i kody: 400 dla niepoprawnego UUID, 401 przy braku sesji, 403 gdy istnieje zasób ale użytkownik nie jest właścicielem, 404 gdy zasób nie istnieje, 500 dla nieoczekiwanych wyjątków, z semantyką statusów wg RFC 9110/MDN.
   </analysis>

### Przegląd punktu końcowego

Endpoint zwraca szczegóły pojedynczego rozliczenia po identyfikatorze, z odpowiedzią 200 oraz błędami 401/403/404, i jest zaimplementowany jako Astro API route w src/pages/api/settlements/[id].json.ts z SSR oraz prerender=false.
Dostęp kontrolowany jest przez Supabase SSR client i Row Level Security, gdzie autoryzacja opiera się o sesję użytkownika i reguły odczytu dopuszczające wyłącznie owner_id danego rozliczenia, co realizuje zasadę obrony w głąb.

### Szczegóły żądania

- Metoda i ścieżka: GET /settlements/{id} z parametrem id w ścieżce, obsługiwane jako dynamiczny endpoint Astro z export const GET i wyłączonym prerenderowaniem.
- Autoryzacja: Supabase SSR createServerClient bazujący na cookies, który odzyskuje sesję i user id na serwerze, bez ekspozycji kluczy po stronie klienta.
- Walidacja: Zod schema dla id jako uuid, błędne wartości skutkują 400 Bad Request zgodnie z RFC 9110.

### Szczegóły odpowiedzi

- 200 OK: Body typu SettlementDetailsDTO, zgodne ze strukturą listy/detalu GET /settlements, serializowane do JSON z odpowiednimi polami i typami czasów/kwot.
- 401 Unauthorized: Brak ważnej sesji SSR z Supabase lub brak nagłówka cookies powoduje odmowę bez dalszego wykonywania zapytania.
- 403 Forbidden: Uwierzytelniony użytkownik nie jest właścicielem danego rozliczenia, co jest wykrywane przez RLS/warstwę serwisową i skutkuje zakazem dostępu.
- 404 Not Found: Brak zasobu o podanym id, tj. nie istnieje żaden rekord settlements.id, rozróżniane bez wycieku danych dzięki kontrolowanemu sprawdzeniu istnienia.

### Przepływ danych

- Wejście: Request trafia do Astro API route, param id jest parsowany z params i walidowany Zod, a brak zgodności powoduje 400 bez wykonywania zapytań do DB.
- Sesja: Tworzony jest Supabase SSR client z cookies, który zapewnia user context dla zapytań, a w przypadku braku sesji zwracane jest 401.
- Autoryzacja: Selekcja settlements odbywa się przez klienta użytkownika z RLS, co uniemożliwia odczyt nieautoryzowanych rekordów na poziomie bazy danych.
- Rozróżnienie 403/404: W warstwie service wywoływana jest kontrolowana ścieżka sprawdzająca istnienie zasobu i właściciela (np. SECURITY DEFINER lub widok z minimalnym ujawnieniem), aby mapować poprawnie 403 vs 404 bez wycieku danych.
- Wyjście: Sukces zwraca JSON SettlementDetailsDTO z 200, ustawiając JSON content-type, a Astro endpoint używa Response i nie jest prerenderowany.

### Względy bezpieczeństwa

- RLS i polityki: Wymuszona selekcja wyłącznie gdy auth.uid() = settlements.owner_id, z włączonym RLS na tabelach publicznych, co ogranicza BOLA/API1 ryzyko.
- SSR i cookies: Użycie createServerClient z httpOnly, secure i sameSite ogranicza wektory XSS/CSRF, z konfiguracją zgodną z praktykami SSR Auth.
- OWASP API Top 10: Zapobieganie Broken Object Level Authorization, Security Misconfiguration i Improper Inventory Management przez spójne RLS, kontrolę adaptera SSR i udokumentowane API.
- Minimalizacja informacji: Rozróżnienie 403/404 bez ujawniania pól obiektu, a komunikaty błędów są ogólne i nie zdradzają szczegółów wewnętrznych.

### Obsługa błędów

- 400 Bad Request: Nieprawidłowy UUID w ścieżce wykryty przez Zod, z komunikatem o nieprawidłowym parametrze.
- 401 Unauthorized: Brak lub nieważna sesja SSR, brak nagłówka cookies lub brak użytkownika w supabase.auth.getUser, odpowiedź bez treści domenowej.
- 403 Forbidden: Zasób istnieje, lecz użytkownik nie jest właścicielem, zgodne z kontrolą dostępu i RLS.
- 404 Not Found: Id nie istnieje w bazie, ustalone bez wycieku danych dzięki kontrolowanemu sprawdzeniu istnienia obiektu, a nie błędom z selekcji objętej RLS.
- 500 Internal Server Error: Nieoczekiwany błąd runtime lub błąd komunikacji z bazą, z logowaniem strukturalnym i korelacją żądania, bez ekspozycji stack trace do klienta.

### Wydajność

- Zapytanie punktowe: Indeks na settlements.id zapewnia O(1) lookup, a SSR minimalizuje JS po stronie klienta zgodnie z ideą Astro endpoints.
- Brak N+1: Endpoint zwraca tylko SettlementDetailsDTO, nie pobiera list uczestników ani wydatków, co redukuje koszty zapytań.
- Caching po stronie CDN: Możliwy krótkotrwały cache 200 odpowiedzi dla zamkniętych rozliczeń, ale uwzględniając autoryzację i prywatność należy domyślnie unikać cache publicznego.

### Kroki implementacji

- Struktura plików: Utworzyć src/pages/api/settlements/[id].json.ts z export const prerender = false oraz export async function GET(ctx).
- Supabase SSR: Zaimplementować createServerClient helper i w Astro middleware umieścić supabase w context.locals, zgodnie z przewodnikiem SSR Auth.
- Service: Dodać src/lib/services/settlements.service.ts z getSettlementById i checkAccess, wywoływanymi z endpointu, korzystając z klienta z locals.
- Walidacja: Dodać Zod schema na id (z.string().uuid()), i na błędnym id zwracać 400 z prostym JSON error.
- Autoryzacja: Na brak sesji 401, a dla rozróżnienia 403/404 użyć kontrolowanej ścieżki sprawdzającej istnienie (np. SECURITY DEFINER) bez ujawniania atrybutów.
- Statusy i treść: Zwracać 200 z SettlementDetailsDTO, 401/403/404/500 zgodnie z RFC 9110 i MDN, z application/json.
- Logowanie: Dodać strukturalne logi serwera z identyfikatorem żądania w middleware oraz poziomami błędów dla 5xx, bez wrażliwych danych.
- CI/CD: Upewnić się, że adapter SSR i sekrety Supabase są poprawnie skonfigurowane w środowisku uruchomieniowym, a publikacja respektuje endpointy serwerowe.

---

# .ai/view-implementation-plan.md

### Przegląd punktu końcowego

Celem jest implementacja GET /settlements/{id} jako Astro Server Endpoint zwracającego szczegóły rozliczenia w formacie SettlementDetailsDTO, z poprawnym mapowaniem statusów 200/401/403/404 zgodnie z HTTP Semantics.
Endpoint działa w SSR, nie jest prerenderowany, wykorzystuje Supabase SSR client oparty na cookies i egzekwuje dostęp przez RLS na poziomie bazy.

### Szczegóły żądania

- Ścieżka i metoda: GET /settlements/{id}, plik src/pages/api/settlements/[id].json.ts z export const GET, a także export const prerender = false.
- Parametry: {id} w ścieżce, walidowany jako UUID poprzez Zod przed jakąkolwiek interakcją z DB, co pozwala zwrócić 400 przy nieprawidłowym formacie.
- Autoryzacja: Sesja odzyskiwana poprzez Supabase SSR createServerClient z bezpiecznym zarządzaniem cookies, wymagane do dalszego przetwarzania (401 w przeciwnym razie).

### Szczegóły odpowiedzi

- 200 OK: Zwraca SettlementDetailsDTO (alias SettlementSummaryDTO), dokładnie pola z definicji typu, bez dodatkowych danych obliczonych i w JSON.
- 401 Unauthorized: Brak sesji/niezalogowany użytkownik, zwracany natychmiast bez odpytywania bazy.
- 403 Forbidden: Zasób istnieje, lecz użytkownik nie jest właścicielem (owner_id ≠ auth.uid()), co egzekwuje RLS i dodatkowe sprawdzenie w service.
- 404 Not Found: Brak rozliczenia o danym id, ustalane przez kontrolowany check istnienia, aby nie ujawniać metadanych zasobu.
- 500 Internal Server Error: Nieoczekiwane błędy wykonania, zwracane z generycznym komunikatem i logowane po stronie serwera.

### Przepływ danych

- Walidacja wejścia: Zod uuid dla params.id, a w razie błędu natychmiast 400 i przerwanie przetwarzania.
- Inicjalizacja klienta: SSR createServerClient z cookies w middleware i dostępny w ctx.locals w endpointzie, co zapewnia spójny user context.
- Autoryzacja dostępu: Pierwsza próba pobrania przez klienta użytkownika z RLS gwarantuje brak ujawnienia danych przy braku uprawnień, ponieważ niewłaściwe wiersze są filtrowane.
- Rozróżnienie 403 i 404: Warstwa service wywołuje kontrolowaną funkcję sprawdzającą istnienie i właściciela (np. SECURITY DEFINER ograniczający zakres), aby poprawnie zwrócić 403 lub 404 bez wycieku treści.
- Serializacja: Na sukces serializacja rekordów do SettlementDetailsDTO i utworzenie Response z application/json, zgodnie z Astro API routes.

### Względy bezpieczeństwa

- RLS: Włączone i egzekwowane, polityka SELECT na settlements dopuszcza tylko wiersze gdzie owner_id = auth.uid(), co zapobiega Broken Object Level Authorization.
- SSR Auth: Cookies httpOnly/secure/sameSite i createServerClient minimalizują ryzyko XSS/CSRF i poprawnie propagują sesję między żądaniami.
- OWASP API Top 10: Adresowane ryzyka API1 (BOLA), API8 (misconfiguration) i API9 (inventory) przez spójne reguły, ogólne komunikaty błędów i dokumentację endpointów.
- Minimalizacja informacji: Komunikaty błędów nie zawierają detali DB ani kluczy, a różnicowanie 403/404 jest implementowane ostrożnie, aby nie ujawniać istnienia cudzych zasobów w sposób nadmierny.

### Obsługa błędów

- Mapowanie statusów: 400 dla niepoprawnego UUID, 401 dla braku sesji, 403 dla braku uprawnień przy istniejącym zasobie, 404 dla nieistniejącego zasobu, 500 dla wyjątków serwerowych, z definicjami wg RFC 9110/MDN.
- Logowanie: Strukturalne logi w middleware i w endpointach (correlation-id, metoda, ścieżka, status, latency), bez PII i bez treści domenowych w 4xx/5xx, oraz diagnostyka SSR auth.
- Telemetria: Agregacja metryk liczby żądań, czasów odpowiedzi i rozkładu statusów do porównań regresji w CI/CD i środowisku.

### Wydajność

- Proste selekty: Selekcja po PK id i ograniczenie pól do DTO ogranicza koszty i zapewnia stały czas wykonania, zgodnie z wytycznymi projektowania endpointów.
- Brak dodatkowych joinów: Endpoint nie dołącza uczestników ani wydatków, co zmniejsza I/O i ryzyko N+1 wewnątrz SSR.
- SSR i routing: Użycie Astro server endpoints minimalizuje JS na kliencie i skraca ścieżkę do danych w porównaniu do hybrydowych rozwiązań.

### Kroki implementacji

- Middleware SSR: W src/middleware/index.ts zainicjalizować Supabase SSR client createServerClient i włożyć go do context.locals, oraz nadać correlation-id dla logowania.
- Service: W src/lib/services/settlements.service.ts dodać getSettlementById(ctx, id) oraz checkAccessOrExistence(ctx, id) do rozróżnienia 403/404 w kontrolowany sposób.
- Endpoint: W src/pages/api/settlements/[id].json.ts zaimplementować export const prerender = false i export const GET, używać locals.supabase, walidować id Zod, a następnie wykonać ścieżkę autoryzacji/odczytu.
- Zod: Dodać schema const IdSchema = z.object({ id: z.string().uuid() }) i parse na ctx.params, a błąd walidacji mapować do 400.
- Kody statusu: Implementacja mapowania 200/401/403/404/500 i spójnych body error w JSON zgodnie z HTTP Semantics.
- Testy: Testy jednostkowe service i integracyjne endpointu dla scenariuszy 200/400/401/403/404, w tym przypadków brzegowych formatu UUID i braku sesji.
- Konfiguracja środowiska: Zapewnić SUPABASE_URL i SUPABASE_ANON_KEY w środowisku SSR, a adapter SSR i polityki RLS dostępne w migracjach.

Wskazówka implementacyjna (szkic kodu endpointu):

- Waliduj id przez Zod, pobierz supabase z locals, sprawdź sesję getUser, rozstrzygnij 403/404 kontrolowanym sprawdzeniem i zwróć DTO przy 200, pamiętając o application/json i braku prerender.
