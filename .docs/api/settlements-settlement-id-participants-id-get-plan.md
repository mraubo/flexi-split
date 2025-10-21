Poniżej znajduje się analiza i kompletny, wdrożeniowy plan dla punktu GET /settlements/{settlement_id}/participants/{id}, gotowy do zaimplementowania w Astro 5 + Supabase z walidacją Zod i ochroną RLS, wraz z nagłówkami cache i regułami błędów zgodnymi z HTTP Semantics RFC 9110/9111 oraz OWASP API Top 10 2023 jako podstawą zaleceń bezpieczeństwa.
Plan jest przygotowany pod strukturę katalogów projektu oraz middleware Astro z wykorzystaniem context.locals do przekazania klienta Supabase i informacji o użytkowniku do handlera endpointu.

<analysis>
1) Kluczowe punkty specyfikacji: Endpoint to GET /settlements/{settlement_id}/participants/{id} i zwraca pojedynczego uczestnika w takiej samej strukturze jak element listy uczestników (ParticipantDTO), z kodem 200 przy sukcesie oraz 401/403/404 dla błędów autoryzacji, uprawnień i braku zasobu zgodnie z semantyką HTTP.
Wymagane są autentykacja i autoryzacja, a polityki RLS w Supabase muszą weryfikować dostęp do wiersza uczestnika na poziomie settlement_id i właściciela rozliczenia, co ogranicza ryzyko BOLA (API1:2023).

2) Parametry: Wymagane path params to settlement_id oraz id (oba UUID), bez parametrów zapytania; nieprawidłowe identyfikatory skutkują 400, brak sesji 401, brak uprawnień 403, a brak rekordu 404, zgodnie z definicją kodów MDN.
W warstwie serwera parametry są pobierane z APIContext.params w Astro endpointach, a walidacja typów realizowana Zod-em, co zapewnia spójność runtime i typów TypeScript.

3) DTO i modele: Zwracany obiekt jest ParticipantDTO (id, nickname, is_owner, created_at, updated_at, last_edited_by) jako prosty JSON, co jest zgodne z powszechnym stylem REST w Astro API routes i łatwo mapowane dzięki TypeScript i Zod.
Żadne Command modele nie są wymagane dla GET, a typ odpowiedzi powinien być zgodny z kontraktem listowego elementu uczestnika dla ujednolicenia frontendu i backendu, co upraszcza kliencką integrację w Astro.

4) Ekstrakcja do service: Logikę dostępu do danych umieść w participantsService.getById(settlementId, id, userId), używając klienta Supabase umieszczonego w Astro context.locals przez middleware, aby uniknąć bezpośrednich importów i zapewnić spójne uwierzytelnianie i RLS.
Service odpowiada za: walidację wejścia (delegowaną z handlera), zapytanie SELECT z RLS, mapowanie do DTO oraz normalizację błędów (NotFound, Forbidden) zgodnie z politykami.

5) Walidacja: Zod waliduje settlement_id i id jako UUID oraz sprawdza brakujące parametry, zwracając 400 przy błędach wejścia, a semantyczne błędy autoryzacji i dostępu są mapowane odpowiednio na 401/403/404 według MDN i RFC 9110.
Na poziomie bazy Postgres egzekwuje ograniczenia (np. kolumna nickname_norm jako GENERATED ALWAYS AS lower(nickname) STORED) wspierając spójność, choć to endpoint tylko-odczytowy; RLS musi być włączone i poprawnie zdefiniowane, aby chronić dane.

6) Rejestrowanie błędów: Błędy 5xx i nietypowe sytuacje warto rejestrować jako strukturalne logi aplikacyjne i zapisy w dedykowanej tabeli błędów lub telemetryce, co wspiera wykrywanie problemów z autoryzacją i zużyciem zasobów (OWASP API4/8).
W Astro można dodać rejestrowanie w handlerze i middleware, korzystając z context.locals do przekazywania korelacyjnych metadanych, co ułatwia spójne dzienniki w całym request lifecycle.

7) Zagrożenia bezpieczeństwa: Najważniejsze ryzyka to BOLA (API1:2023) przy dostępie przez identyfikatory w ścieżce, błędna autoryzacja funkcji (API5:2023), oraz błędna konfiguracja zabezpieczeń (API8:2023), które minimalizują poprawne polityki RLS, jawne sprawdzenia właścicielstwa i twarde filtrowanie po settlement_id.
Zaleca się również ochronę przed nadmiernym zużyciem zasobów (API4:2023) przez reguły rate limiting na Cloudflare WAF dla ścieżki /api/settlements/* oraz nagłówki cache z ETag/Last-Modified do wydajnej rewalidacji.

8) Scenariusze błędów: Brak tokenu/nieprawidłowy — 401; brak uprawnień po RLS — 403; brak rekordu — 404; nieprawidłowe UUID — 400; błąd po stronie serwera lub bazy — 500, zgodnie z MDN i HTTP Semantics.
W odpowiedziach błędów unikaj ujawniania szczegółów polityk RLS i struktury danych, co zmniejsza powierzchnię ataku (API8:2023).
</analysis>

### Przegląd punktu końcowego
- Cel: Zwraca jednego uczestnika danego rozliczenia po identyfikatorach settlement_id i id, z odpowiedzią 200 i strukturą jak w liście uczestników, a w przypadku błędów zwraca 401/403/404 zgodnie z semantyką HTTP dla autentykacji, autoryzacji i braku zasobu.
- Architektura: Astro API Route w pliku src/pages/api/settlements/[settlement_id]/participants/[id].ts z SSR i export const prerender = false, używająca context.locals do pobrania klienta Supabase oraz danych o użytkowniku.
- Ochrona danych: RLS w Supabase musi być włączone i polityki muszą ograniczać SELECT do uczestników rozliczeń należących do uwierzytelnionego użytkownika (właściciela settlement), co zapobiega BOLA (API1:2023).

### Szczegóły żądania
- Metoda i ścieżka: GET /settlements/{settlement_id}/participants/{id}, gdzie oba segmenty to UUID, pobierane z APIContext.params w Astro endpointzie.
- Autentykacja: Wymagany ważny token sesyjny powiązany z Supabase Auth; brak lub nieważny token skutkuje 401 Unauthorized zgodnie z MDN i wymogami ochrony RLS.
- Walidacja wejścia: Zod weryfikuje schemat path params (uuid dla settlement_id i id), a przy niezgodności zwraca 400 Bad Request z krótkim opisem błędu i polem pointer do parametru.

### Szczegóły odpowiedzi
- Sukces 200: JSON z polami ParticipantDTO: id, nickname, is_owner, created_at, updated_at, last_edited_by; Content-Type: application/json; ETag obliczany np. na bazie updated_at oraz Last-Modified ustawiony na updated_at w celu wsparcia rewalidacji cache wg RFC 9110/9111 oraz praktyk MDN.
- Cache: Ustaw Cache-Control: private, max-age=0, must-revalidate i obsłuż If-None-Match/If-Modified-Since, aby zwrócić 304 Not Modified, gdy zasób nie zmienił się; preferowane jest dostarczanie zarówno ETag jak i Last-Modified.
- Błędy: 401 bez WWW-Authenticate w responsach API opartych o tokeny bearer; 403 przy braku uprawnień po autentykacji; 404 gdy wiersz uczestnika nie istnieje dla pary settlement_id/id; 400 dla błędnego UUID; 500 dla nieoczekiwanego błędu.

### Przepływ danych
- Middleware: onRequest w src/middleware/index.ts uwierzytelnia żądanie, buduje supabase client i umieszcza go w context.locals wraz z identyfikatorem użytkownika, co udostępnia te dane w handlerze endpointu.
- Handler: GET handler pobiera params, waliduje Zod-em, odpytuje participantsService.getById(settlementId, participantId, userId), mapuje wynik do DTO i buduje nagłówki ETag/Last-Modified.
- RLS: SELECT wykonuje się z tokenem użytkownika, a polityka RLS dopuszcza wyłącznie rekordy uczestników należących do rozliczeń użytkownika; naruszenie skutkuje brakiem widoczności wiersza, co przekłada się na 404 lub 403 w zależności od wzorca obsługi błędów.

### Względy bezpieczeństwa
- BOLA: Wymuś autoryzację obiektową przez powiązanie zapytania z settlement_id i id oraz kontrolę właściciela; mechanicznie zapewnia to RLS i dodatkowe sprawdzenie w service dla spójnego mapowania błędów (API1:2023).
- Konfiguracja: Upewnij się, że RLS jest włączone dla participants i settlements, a polityki są ograniczające; unikaj konfiguracji domyślnych, które pozostawiają dane publiczne (API8:2023).
- Rate limiting: Skonfiguruj na Cloudflare WAF regułę rate limiting dla ścieżki /api/settlements/* z charakterystyką per-IP i rozsądnym progiem, aby redukować API4:2023 Unrestricted Resource Consumption.

### Obsługa błędów
- Mapowanie: 400 dla błędnych UUID (Zod), 401 gdy brak sesji, 403 gdy użytkownik uwierzytelniony nie ma dostępu, 404 gdy rekord niedostępny/nie istnieje, 500 dla błędów nieprzewidzianych, zgodnie z MDN i RFC 9110.
- Treść błędów: Minimalne komunikaty bez ujawniania reguł RLS i szczegółów bazy; loguj diagnostykę po stronie serwera, a klientowi zwracaj kod i krótki opis przyjazny dla UI, zgodnie z zasadą ograniczania ekspozycji szczegółów (API8:2023).
- Rejestrowanie: Dodaj strukturalne logi w handlerze i service oraz opcjonalnie wpis w wewnętrznej tabeli błędów dla 5xx w celu korelacji i analizy, wykorzystując context.locals do przenoszenia identyfikatorów żądania.

### Wydajność
- Rewalidacja: Włącz ETag i Last-Modified oraz honoruj If-None-Match/If-Modified-Since, żeby unikać zbędnego transferu i umożliwiać 304 Not Modified zgodnie z RFC 9111 i zaleceniami MDN.
- CDN/WAF: Cloudflare może amortyzować ruch nieautoryzowany przez reguły bezpieczeństwa i ograniczanie żądań; pamiętaj, że odpowiedzi prywatne nie powinny być cache’owane współdzielone, więc używaj dyrektyw private/must-revalidate.
- Minimalny zakres danych: Endpoint zwraca wyłącznie niezbędne pola DTO, co ogranicza rozmiar odpowiedzi i ekspozycję, zgodnie ze zdrową praktyką projektowania API.

### Kroki implementacji
1) Middleware auth i Supabase:  
- Utwórz src/middleware/index.ts, z onRequest ustawiając supabase client i user w context.locals, aby endpoint nie importował klienta bezpośrednio, zgodnie z zaleceniami Astro dotyczących locals.
- Zweryfikuj sesję i w przypadku braku sesji pozwól handlerowi zwrócić 401, aby zachować centralizację mapowania odpowiedzi w warstwie API.

2) Plik endpointu:  
- Utwórz src/pages/api/settlements/[settlement_id]/participants/[id].ts, export const prerender = false, eksportuj async function GET(context) i odczytaj params oraz locals, zgodnie z dokumentacją Astro endpoints.
- Zbuduj odpowiedź JSON Response z odpowiednimi nagłówkami Content-Type, ETag i Last-Modified, aby wspierać rewalidację cache.

3) Walidacja Zod:  
- Zdefiniuj schemat path params: { settlement_id: z.string().uuid(), id: z.string().uuid() }, a przy błędach rzuć 400 Bad Request z krótkim opisem i pointerem; wykorzystaj parse/safeParse, aby otrzymać czytelne błędy.

4) Service warstwa:  
- Dodaj src/lib/services/participants.service.ts z participantsService.getById, który: przyjmuje supabase client, userId, settlementId i participantId; wykonuje zapytanie SELECT z where settlement_id = ... and id = ...; zwraca rekord lub odpowiedni błąd domenowy.
- W service przemapuj rekord do DTO, ograniczając pola do kontraktu i unikając ujawniania wewnętrznych kolumn, co upraszcza stabilność kontraktu klienckiego.

5) RLS i zabezpieczenia DB:  
- Upewnij się, że RLS jest enabled dla tables w schema public, a polityka SELECT na participants dopuszcza tylko rekordy, które należą do rozliczeń, gdzie settlements.owner_id = auth.uid(), co minimalizuje BOLA.
- Zweryfikuj, że generowane kolumny (np. nickname_norm) działają zgodnie z Postgres Generated Columns STORED, choć endpoint nie modyfikuje danych, co zapewnia spójność wyszukiwania w innych częściach API.

6) Nagłówki HTTP i cache:  
- Ustaw Content-Type: application/json; Cache-Control: private, max-age=0, must-revalidate; ETag i Last-Modified oparte o updated_at i/lub stabilny hash reprezentacji; obsłuż If-None-Match/If-Modified-Since i zwracaj 304.
- Przestrzegaj HTTP Semantics RFC 9110 dla statusów i nagłówków oraz preferencji walidatorów warunkowych.

7) Rate limiting i WAF:  
- Na Cloudflare WAF skonfiguruj regułę rate limiting dla ścieżek /api/settlements/* z charakterystyką per-IP, okresem, progiem żądań i akcją po przekroczeniu, aby ograniczyć konsumowanie zasobów.
- Dla większych wdrożeń rozważ tworzenie rulesetów poprzez API, by wersjonować i propagować polityki w środowiskach.

8) Obsługa błędów i logowanie:  
- W handlerze łap znane błędy domenowe (ValidationError → 400, Unauthorized → 401, Forbidden → 403, NotFound → 404) i fallback na 500 dla reszty, bez ujawniania szczegółów technicznych w treści.
