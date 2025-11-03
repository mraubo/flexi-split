# Analiza i plan wdrożenia punktu końcowego DELETE /settlements/{id}

Poniżej znajduje się analiza oraz kompletny, szczegółowy plan wdrożenia punktu końcowego DELETE /settlements/{id}, zgodny z dobrymi praktykami HTTP, Astro API routes, walidacją Zod, politykami RLS w Supabase i wytycznymi bezpieczeństwa OWASP API Top 10.

Plan przyjmuje semantykę 204 No Content dla powodzenia, wykorzystuje RLS do egzekwowania uprawnień właściciela oraz wzorzec soft delete, aby spełnić wymóg „brak hard delete” i zachować spójność danych.

## Analiza

- Kluczowe punkty specyfikacji: Endpoint to DELETE /settlements/{id} i usuwa rozliczenie wyłącznie, gdy status='closed', zwracając 204 No Content bez treści, a w przeciwnym wypadku błędy 401/403/404/422, przy czym 422 reprezentuje poprawną składnię, lecz operację semantycznie niemożliwą (np. settlement otwarty).
- Parametry: Wymagany path param id (UUID) oraz nagłówek Authorization; brak ciała żądania i opcjonalnych parametrów, zgodnie z wzorcem REST dla DELETE oraz praktyką 204 bez treści.
- Niezbędne typy: Reużycie aliasu UUID, brak DTO odpowiedzi (pusta), brak Command modeli dla DELETE, a walidacja wejdzie przez Zod schemat dla path param i obsłuży błędy 400 dla złego UUID, mapując semantykę HTTP do opisu 422, gdy status biznesowy nie pozwala na usunięcie.
- Logika w service: Ekstrakcja do src/lib/services/settlements.service.ts (np. deleteSettlementSoft) w celu centralizacji reguł autoryzacji i soft delete, przy czym RLS w Supabase będzie pełnić rolę obrony w głąb i egzekwować ograniczenia na poziomie danych.
- Walidacja: Zod do sprawdzenia UUID, autentykacja przez middleware i Astro.locals, autoryzacja właściciela egzekwowana w SQL politykami RLS i ewentualnie w warstwie service; weryfikacja, że status='closed' i nie jest już soft-deleted, zwróci 422, jeżeli naruszenie reguły biznesowej, zgodnie z semantyką 422.
- Rejestrowanie błędów: Główne logi na poziomie serwera/hosting (Cloudflare Pages/Workers logging) oraz możliwość rozszerzenia o eksport do zewnętrznego kolektora logów, jeśli nie istnieje dedykowana tabela błędów.
- Zagrożenia bezpieczeństwa: BOLA/IDOR przy użyciu identyfikatorów zasobu, błędna konfiguracja RLS, rozróżnienie 401 vs 403, ograniczenia rate limiting i ochrona przed „Unrestricted Resource Consumption” wg OWASP API Top 10 2023.
- Scenariusze błędów i kody: 400 dla niepoprawnego UUID, 401 brak/niepoprawny token, 403 brak uprawnień właściciela, 404 brak zasobu lub soft-deleted niewidoczny, 422 otwarty settlement, 500 nieoczekiwane błędy, a 204 musi nie zawierać treści ani Content-Length.

## Przegląd punktu końcowego

Endpoint służy do usunięcia rozliczenia wyłącznie wtedy, gdy jego status to closed, a w razie powodzenia zwraca 204 No Content bez ciała odpowiedzi, co jest rekomendowaną semantyką HTTP dla operacji DELETE bez payloadu.
Zgodnie z zasadą „brak hard delete”, operacja zostanie zaimplementowana jako soft delete (np. ustawienie deleted_at), a egzekwowanie widoczności i dostępu odbędzie się przez RLS, co zapewnia obronę w głąb na poziomie bazy.

### Szczegóły żądania

- Metoda i ścieżka: DELETE /settlements/{id}, gdzie id to wymagany UUID, weryfikowany na wejściu, bez ciała żądania i z nagłówkiem Authorization w celu autentykacji.
- Autentykacja i kontekst: Middleware Astro ustawia kontekst w Astro.locals (np. supabase, user) i jest dostępny w API route, co umożliwia spójne odczytanie tożsamości użytkownika i tokenu.
- Idempotencja i semantyka: W przypadku ponownego wywołania po skutecznym soft delete, zasób nie będzie już dostępny do usunięcia i powinien skutkować 404 Not Found, utrzymując przejrzystość stanu zasobu dla klienta.

### Szczegóły odpowiedzi

- Sukces: 204 No Content bez treści i bez nagłówka Content-Length, ponieważ przeglądarki mogą odrzucać odpowiedzi 204 zawierające body, co potwierdza MDN.
- Błędy: JSON error payload dla kodów 400/401/403/404/422/500, przy czym 422 użyty dla semantycznie niepoprawnej operacji (np. status != closed) zgodnie z definicją „Unprocessable Content”.

### Przepływ danych

- Warstwa HTTP: Astro API route w src/pages/api/settlements/[id].ts z export const prerender = false, by obsłużyć żądanie na serwerze oraz integrację z middleware dla autentykacji i locals.
- Warstwa usług: Serwis settlements.service.deleteSettlementSoft pobiera rekord, weryfikuje właściciela i status, a następnie wykonuje soft delete przez ustawienie kolumny deleted_at, co wpisuje się w praktykę soft deletes.
- Warstwa danych: RLS w Supabase ogranicza dostęp do rekordów na poziomie wiersza, np. do właściciela i tylko dla rekordów o deleted_at IS NULL, co chroni przed ujawnieniem danych i IDOR na poziomie SQL.

### Względy bezpieczeństwa

- Autoryzacja obiektowa: Sprawdzanie uprawnień właściciela i ograniczanie operacji do posiadanego settlements.id, aby uniknąć BOLA/IDOR (API1:2023), zarówno w aplikacji, jak i w politykach RLS.
- Konfiguracja i RLS: RLS musi być włączone i poprawnie zdefiniowane, aby wszystkie zapytania respektowały widoczność i własność, co jest kluczowym elementem „defense in depth” w Supabase.
- Odporność operacyjna: Rozważ limitowanie żądań i timeouts, aby ograniczyć „Unrestricted Resource Consumption” (API4:2023), oraz konsekwentne zwracanie 401 vs 403 celem redukcji informacji o istnieniu zasobów.

### Obsługa błędów

- Mapowanie błędów: 400 dla nieprawidłowego UUID, 401 dla braku/nieprawidłowej autentykacji, 403 dla braku uprawnień, 404 dla braku zasobu, 422 dla statusu innego niż closed, 500 dla błędów nieoczekiwanych, zgodnie z definicjami MDN i semantyką 422.
- Treść błędu: Struktura { error: string; message: string; code: string } dla spójnej diagnostyki i łatwiejszej obserwowalności, z logowaniem na poziomie funkcji API i eksportem do infrastruktury dzienników na Cloudflare Pages/Workers.

### Wydajność

- Minimalizacja round-trip: Jedno pobranie rekordu i jedna aktualizacja soft delete, bez dodatkowych listowań, co ogranicza opóźnienia po stronie serwera API route w Astro.
- Brak payloadu sukcesu: Zastosowanie 204 eliminuje transfer treści i upraszcza ścieżkę I/O, zgodnie z zaleceniami MDN dla semantyki DELETE.

### Kroki implementacji

- Schemat danych: Dodać kolumnę deleted_at timestamptz do settlements i aktualizować wszystkie zapytania oraz RLS, aby domyślnie pomijały wiersze z deleted_at IS NULL, zgodnie z praktykami soft delete.
- Polityki RLS: Włączyć RLS i dodać polityki ograniczające SELECT/UPDATE/DELETE do właściciela, wymuszające deleted_at IS NULL oraz operację usunięcia tylko, gdy status='closed', zapewniając autoryzację na poziomie wiersza.
- Middleware: Skonfigurować Astro middleware i używać context.locals do przekazania supabase client i tożsamości do API routes, co umożliwia spójny dostęp do autentykacji w całej warstwy serwera.
- API route: Utworzyć src/pages/api/settlements/[id].ts, ustawić export const prerender = false, użyć Zod do walidacji path param UUID, a następnie wywołać serwis i zwrócić 204 lub zmapowane kody błędów.
- Walidacja: Zdefiniować Zod schema dla params i mapować błędy walidacji na 400, rozróżniając je od 422, które dotyczą wyłącznie reguł biznesowych (status != closed).
- Logowanie: Dodać obsługę logów błędów i metryk w warstwie API route oraz integrację z mechanizmami logowania Cloudflare Pages/Workers do analizy operacyjnej.
- Testy: Przygotować testy integracyjne dla ścieżek: 204 (zamknięty), 422 (otwarty), 404 (brak), 401/403 (autentykacja/autoryzacja), z weryfikacją, że odpowiedź 204 nie zawiera ciała.

W razie potrzeby, dodatkowo można zastosować regułę bazy, która zamienia fizyczne DELETE na UPDATE ustawiający deleted_at, aby „twardo” wymusić soft delete na poziomie Postgres, jednak przy API routes i kontrolowanej warstwie dostępu zwykle wystarczy prosty UPDATE po stronie serwisu i polityki RLS.
