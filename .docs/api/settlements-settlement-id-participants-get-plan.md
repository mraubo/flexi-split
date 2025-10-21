<analysis>
1) Spec kluczowe: Endpoint GET /settlements/{settlement_id}/participants zwraca listę uczestników rozliczenia z paginacją i meta-danymi, obsługuje page i limit (domyślnie 1 i 50, max 100), status 200 dla sukcesu, błędy 401/403/404; wynik to PagedResponse<ParticipantDTO> z polami id, nickname, is_owner, created_at, updated_at, last_edited_by oraz pagination z page, limit, total, total_pages zgodnie z konwencjami REST i Astro server endpoints dla GET handlera.
2) Parametry: wymagany path param settlement_id (UUID), opcjonalne query params page (liczba całkowita ≥ 1, domyślnie 1) i limit (liczba całkowita 1–100, domyślnie 50), które należy walidować po stronie serwera Zod-em oraz stosować offset/limit do zapytań, zgodnie z dobrymi praktykami endpointów i HTTP 200/400 dla poprawnych i niepoprawnych żądań.
3) DTO i modele: ParticipantDTO, ParticipantsListResponse = PagedResponse<ParticipantDTO>, PaginationMeta, GetParticipantsQuery oraz UUID/TimestampString zgodnie z przekazanymi definicjami typów; brak Command modeli dla tego GET, bo to operacja odczytu, a statusy i metadane wyników powinny być zgodne z zdefiniowanymi PagedResponse i PaginationMeta.
4) Ekstrakcja logiki: wydziel service participantsService z metodą listParticipants(settlementId, { page, limit }, supabase) oraz repozytorium participantsRepo dla zapytań z SELECT i COUNT, aby handler GET w Astro był cienki i ograniczony do walidacji oraz mapowania na DTO, zgodnie z wzorcami rozdziału warstw back-endu i dokumentacją Astro endpoints.
5) Walidacja: Zod do walidacji settlement_id (UUID), page/limit (z domyślnymi wartościami i ograniczeniami), a także normalizacja limit do max 100; walidacja autoryzacji przez Supabase Auth + RLS, np. polityka SELECT na participants dopuszczająca tylko ownera rozliczenia (settlements.owner_id = auth.uid()), oraz na settlements dla weryfikacji istnienia i własności, zgodnie z Supabase RLS.
6) Rejestrowanie błędów: brak dedykowanej tabeli błędów w zasobach, więc logowanie strukturalne na serwerze oraz integracja z platformą hostingu (np. Cloudflare funkcje/logi), a odpowiedzi błędów w formacie application/problem+json według RFC 9457 dla spójności klienta z maszynowo-czytelnymi szczegółami błędu.
7) Zagrożenia bezpieczeństwa: BOLA (dostęp do cudzych participants po ID), Broken Auth, nadmierna ekspozycja danych, brak limitowania zapytań i ochrona przed masowym pozyskiwaniem danych; mitigacje to ścisłe RLS i sprawdzanie własności, minimalne pola w DTO, rate limiting na WAF/Cloudflare, oraz konsekwentne kody 401/403/404 zgodnie z OWASP API Security Top 10.
8) Scenariusze błędów: 400 dla nieprawidłowych page/limit lub settlement_id (nie-UUID), 401 dla braku uwierzytelnienia, 403 gdy użytkownik nie jest właścicielem rozliczenia, 404 gdy rozliczenie nie istnieje lub nieosiągalne przez RLS, 500 dla nieoczekiwanych wyjątków serwera; statusy zgodnie z HTTP semantics i MDN.
</analysis>

Plan wdrożenia endpointu REST: GET /settlements/{settlement_id}/participants

### Przegląd punktu końcowego
Celem jest udostępnienie listy uczestników rozliczenia z paginacją, przy czym dostęp ograniczony jest do właściciela danego rozliczenia poprzez Supabase Auth + RLS, a odpowiedzi i błędy są spójne z konwencjami HTTP i JSON API dla list.
Implementacja powinna użyć Astro server endpoints (APIRoute) w katalogu src/pages/api oraz Zod do walidacji wejścia, zwracając 200 z PagedResponse<ParticipantDTO> lub odpowiedni kod błędu 4xx/5xx.

### Szczegóły żądania
- Metoda i ścieżka: GET /settlements/{settlement_id}/participants, z dynamicznym parametrem w nazwie pliku Astro i obsługą query params page oraz limit w handlerze.
- Parametry: settlement_id jako UUID w params, page domyślnie 1 i limit domyślnie 50 z maksymalnym 100 oraz walidacją/normalizacją przez Zod.
- Uwierzytelnienie: wymagane sesyjne poświadczenia Supabase na serwerze; brak ich powinien skutkować 401, a weryfikacja uprawnień w RLS i/lub check aplikacyjny musi blokować dostęp do cudzych rozliczeń.

### Szczegóły odpowiedzi
- Sukces 200: Zwraca strukturę PagedResponse<ParticipantDTO> z polami data oraz pagination, gdzie pagination zawiera page, limit, total i total_pages wyliczone na podstawie COUNT i limitu.
- DTO: ParticipantDTO obejmuje id, nickname, is_owner, created_at, updated_at, last_edited_by i powinien zawierać jedynie minimalny zakres danych, aby ograniczyć ekspozycję informacji.
- Błędy: application/problem+json według RFC 9457 dla 400/401/403/404/500, z polami type, title, status, detail oraz opcjonalnymi rozszerzeniami, co ułatwia obsługę po stronie klienta.

### Przepływ danych
- Wejście: request → parsowanie params i query → walidacja Zod (UUID, page, limit) → pobranie user id z Supabase server client w kontekście.
- Autoryzacja: twardo egzekwowana przez Postgres RLS w Supabase na tabelach settlements i participants; polityka SELECT dopuszcza tylko rekordy, gdzie settlements.owner_id = auth.uid() dla danego settlement_id.
- Dostęp do danych: participantsRepo wykonuje COUNT(*) dla participants gdzie settlement_id = :id oraz SELECT z ORDER BY created_at, OFFSET = (page-1)*limit, LIMIT = limit, po czym mapuje do ParticipantDTO i buduje meta pagination.

### Względy bezpieczeństwa
- BOLA: wymuszenie właściciela poprzez RLS i/lub warunek EXISTS na settlements.owner_id = auth.uid() w polityce SELECT na participants eliminuje dostęp do cudzych list.
- Nadmierna ekspozycja: DTO ograniczony do niezbędnych pól i brak wewnętrznych identyfikatorów użytkowników poza participant id minimalizuje ryzyko API3.
- Ograniczanie nadużyć: egzekwowanie max limit=100 oraz konfigurowalny rate limiting po stronie Cloudflare WAF dla wzorców ścieżek API hamuje masowe skanowanie i scraping.

### Obsługa błędów
- Walidacja: nieprawidłowy UUID albo błędne page/limit → 400 z problem details i wskazaniem nieprawidłowego pola w extension.
- Uwierzytelnienie: brak sesji/tokena → 401 z problem details oraz ewentualnie WWW-Authenticate, zgodnie z semantyką HTTP.
- Autoryzacja: brak uprawnień do rozliczenia → 403 z problem details bez ujawniania, czy zasób istnieje, aby nie przeciekać informacji.
- Nie znaleziono: rozliczenie nie istnieje w granicach RLS → 404, co upraszcza model błędów w kliencie i nie ujawnia polityki RLS.
- Serwer: nieoczekiwany wyjątek → 500 z problem details i wewnętrznym logiem, bez ujawniania stacktrace w odpowiedzi.

### Wydajność
- Zapytania: użycie BTREE indexów po settlement_id i created_at wspiera filtrację i sortowanie; COUNT i page-limited SELECT minimalizują transmisję danych.
- Limit: max 100 wymusza kontrolę rozmiaru odpowiedzi i czasu odpowiedzi, a po stronie WAF można stosować throttle dla endpointu.
- SSR kontekst: użycie server-side Supabase klienta z poświadczeniami z middleware unika dodatkowych round-tripów i zapewnia zgodność z Astro SSR.

### Kroki implementacji
- Routing i plik: utwórz plik src/pages/api/settlements/[settlement_id]/participants.ts z eksportem GET: APIRoute i export const prerender = false, zgodnie z podręcznikiem Astro endpoints.
- Walidacja Zod: zbuduj schemat dla params i query (page default 1, limit default 50, max 100) oraz bezpiecznie rzutuj wartości z URL do liczb całkowitych.
- Supabase klient: w handlerze korzystaj z supabase z locals kontekstu/middleware i pobierz auth użytkownika do przekazania w zapytaniach, zgodnie z instrukcjami integracji Supabase & Astro.
- RLS: w Supabase włącz RLS na settlements i participants; dodaj polityki SELECT: na settlements where owner_id = auth.uid() i na participants where EXISTS (SELECT 1 FROM settlements s WHERE s.id = participants.settlement_id AND s.owner_id = auth.uid()).
- Repo/service: participantsRepo.listAndCount(settlementId, page, limit) wykonuje COUNT i SELECT z OFFSET/LIMIT, a participantsService buduje PagedResponse<ParticipantDTO>.
- Odpowiedzi i błędy: sukces 200 z JSON i nagłówkiem Content-Type: application/json; błędy 400/401/403/404/500 w application/problem+json według RFC 9457, z jednoznacznymi title/detail.

