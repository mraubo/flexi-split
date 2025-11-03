Poniżej znajduje się analiza oraz kompletny plan wdrożenia endpointu PUT /settlements/{settlement_id}/expenses/{id} w Astro + Supabase z walidacją Zod, autoryzacją przez RLS i poprawnym mapowaniem kodów błędów oraz odpowiedzi, zgodnie z dobrymi praktykami REST i bezpieczeństwa API OWASP 2023.

<analysis>
1) Kluczowe punkty specyfikacji API: Endpoint to PUT /settlements/{settlement_id}/expenses/{id} aktualizujący wydatek wyłącznie, gdy settlement ma status 'open', przyjmujący body jak POST i zwracający strukturę jak GET pojedynczej pozycji, z kodami 200, 400, 401, 403, 404, 422.
2) Parametry: Wymagane parametry ścieżki to settlement_id i id, a body wymaga pola payer_participant_id, amount_cents, expense_date oraz participant_ids (≥1), z opcjonalnym description, spójne z kształtem UpdateExpenseCommand; zapytanie nie posiada parametrów.
3) DTO i Command modele: Potrzebne typy to ExpenseDetailsDTO (ExpenseDTO + participants), ExpenseParticipantMiniDTO, UpdateExpenseCommand (tożsame z CreateExpenseCommand), oraz typy bazowe UUID, DateString, AmountCents, zgodnie ze strukturami przedstawionymi dla warstwy API i wykorzystywane w odpowiedzi endpointu.
4) Ekstrakcja logiki do service: Należy utworzyć ExpenseService z metodą updateExpense(...) realizującą walidację, kontrolę dostępu, operacje w transakcji, aktualizację expenses i expense_participants, ustawienie last_edited_by oraz emisję zdarzenia audytowego, tak aby warstwa endpointu pozostała cienka i czytelna.
5) Walidacja danych wejściowych: Wykorzystać Zod do definicji schematu UpdateExpenseCommand, w tym format daty, minimalne uczestnictwo (co najmniej jeden participant_id), dodatnia kwota amount_cents, oraz własne refinements do spójności powiązań, a walidację semantyczną wykonać częściowo w DB przez constrainty i RLS.
6) Rejestrowanie błędów: Jeśli nie ma dedykowanej tabeli błędów, stosować ustrukturyzowane logowanie serwerowe i monitoring, a opcjonalnie rozważyć dodanie prostej tabeli app_errors, pamiętając, że nadmierne logowanie danych wrażliwych jest ryzykiem bezpieczeństwa.
7) Zagrożenia bezpieczeństwa: Krytyczne ryzyka to BOLA (autoryzacja na poziomie obiektów), Mass Assignment/Property-Level Authorization, Broken Authentication, oraz Misconfiguration; użyć RLS w Supabase i kontroli dostępu w kodzie, a także walidacji whitelistingowej pól i filtrowania danych wyjściowych.
8) Scenariusze błędów i kody: 400 dla błędów walidacji syntaktycznej schematu, 401 gdy brak autentykacji, 403 gdy użytkownik nie ma uprawnień do danego settlementu/wydatku, 404 gdy zasób nie istnieje w danym scope, 422 dla walidacji semantycznej jak próba edycji, gdy settlement jest 'closed', a 500 dla nieoczekiwanych błędów.
</analysis>

### Przegląd punktu końcowego

- Celem jest aktualizacja istniejącego wydatku w ramach rozliczenia poprzez PUT /settlements/{settlement_id}/expenses/{id}, zwracając zaktualizowaną reprezentację wydatku zgodną z detalicznym GET, z autentykacją i autoryzacją na poziomie rekordu.
- Operacja jest dozwolona wyłącznie, gdy settlement ma status 'open', co przy niespełnieniu warunku skutkuje kodem 422 Unprocessable Content, z zachowaniem semantyki metod HTTP i standardów odpowiedzi.

### Szczegóły żądania

- Metoda i ścieżka: PUT /settlements/{settlement_id}/expenses/{id}, gdzie oba identyfikatory są wymagane jako część trasy plikowej Astro oraz parametrów kontekstowych APIContext.
- Body: UpdateExpenseCommand z polami wymaganymi payer_participant_id (UUID), amount_cents (bigint > 0), expense_date (YYYY-MM-DD), participant_ids (UUID z min 1, unikalne w obrębie listy), oraz opcjonalnym description (<= 140 znaków), walidowane Zodem z refine dla reguł domenowych.
- Nagłówki: Content-Type: application/json, autoryzacja z Supabase Auth (token JWT/bearer) mapowany na tożsamość użytkownika po stronie serwera, aby odczytać auth.uid() do logiki RLS i audytu.
- Ograniczenia domenowe: payer_participant_id i participant_ids muszą należeć do tego samego settlementu, a przy aktualizacji DML powinien zachować spójność share_count i min. 1 uczestnik, egzekwowane transakcyjnie i przez constrainty/trigger.

### Szczegóły odpowiedzi

- 200 OK: Zwraca ExpenseDetailsDTO zawierający id, payer_participant_id, amount_cents, expense_date, description, share_count, created_at, updated_at, last_edited_by oraz participants jako listę obiektów { id, nickname }.
- Format JSON: Odpowiedź musi mieć prawidłowy Content-Type i zawierać wyłącznie pola jawnie przewidziane w DTO, eliminując ryzyko nadmiernej ekspozycji danych (Property-Level Authorization).

### Przepływ danych

- Wejście: Request trafia do pliku src/pages/api/settlements//expenses/.ts z obsługą PUT i dostępem do params oraz request.json(), zgodnie z Astro Endpoints.
- Walidacja: Zod parse/safeParse dla UpdateExpenseCommand z komunikatami błędów 400 przy błędach syntaktycznych i formatowych, a walidacja semantyczna m.in. powiązań w DB zwraca 422, jeśli polecenia nie mogą zostać zrealizowane mimo poprawnej składni.
- Autentykacja i autoryzacja: Odczyt tożsamości użytkownika poprzez Supabase serwerowo i egzekwowanie RLS oraz kontroli w kodzie, by wymusić, że użytkownik może modyfikować tylko wydatki w rozliczeniach, do których ma uprawnienia (np. owner_id = auth.uid()).
- Transakcja DB: W jednej transakcji wykonać SELECT ... FOR UPDATE na expenses, sprawdzić status settlementu, zaktualizować wiersz expenses, wymienić powiązania w expense_participants, i zatwierdzić przy DEFERRABLE constraintach tak, aby warunki min. 1 uczestnik były weryfikowane na końcu transakcji.
- Wyjście: Po commit pobrać zaktualizowany rekord wraz z participants i zwrócić 200 OK z kompletnym ExpenseDetailsDTO.

### Względy bezpieczeństwa

- BOLA i FL(A): Każde odwołanie do {settlement_id} i {id} musi mieć sprawdzoną własność/dostęp w kodzie i w RLS, aby zapobiec nieautoryzowanym aktualizacjom obiektów.
- Mass Assignment/Property-Level Authorization: Przyjmować i aktualizować tylko whitelisted pola z UpdateExpenseCommand, ignorując lub odrzucając inne właściwości, aby uniknąć przejęcia pól audytowych.
- RLS i polityki: Upewnić się, że tabele publiczne mają RLS włączone i odpowiednie policies filtrujące po auth.uid() i settlement_id, zapewniając defense-in-depth nawet przy błędach aplikacji.
- Konfiguracja i logowanie: Unikać ekspozycji danych wrażliwych w logach i odpowiedziach, stosując zasadę najmniejszych uprawnień oraz poprawną konfigurację środowiska i kluczy.

### Obsługa błędów

- 400 Bad Request: Błędy Zod (typ, zakres, format daty, puste participant_ids), zwracane z ustrukturyzowanym opisem pól.
- 401 Unauthorized: Brak ważnego tokena/niestwierdzona tożsamość użytkownika.
- 403 Forbidden: Użytkownik uwierzytelniony, ale bez uprawnień do wskazanego settlementu lub wydatku, zgodnie z kontrolą w kodzie/RLS.
- 404 Not Found: Brak settlementu lub wydatku w danym scope (powiązanym settlement_id), z ukrywaniem faktów istnienia poza zakresem dostępu.
- 422 Unprocessable Content: Settlement nie jest 'open' lub naruszenia reguł semantycznych (np. brak min. 1 uczestnika po walidacji transakcyjnej), przy poprawnym formacie requestu.
- 500 Internal Server Error: Nieoczekiwane błędy, z neutralnym komunikatem i korelacją w logach serwerowych.

### Wydajność

- Transakcje i blokady: Użycie SELECT ... FOR UPDATE ogranicza wyścigi podczas równoległych aktualizacji tego samego wydatku, a deferrable constraints upraszczają batchową wymianę uczestników bez błędów przejściowych.
- Selektywne pobieranie: Po aktualizacji pobierać tylko wymagane pola DTO, minimalizując nadmierną ekspozycję i koszt serializacji.
- Stabilne indeksy: Korzystać z indeksów po settlement_id i id dla expenses oraz z kluczy PK w expense_participants w celu utrzymania stałych czasów operacji.

### Kroki implementacji

1. Struktura plików: Utworzyć plik src/pages/api/settlements//expenses/.ts i ustawić export const prerender = false oraz export async function PUT(ctx) z wykorzystaniem Astro Endpoints.
2. Inicjalizacja Supabase: W handlerze użyć serwerowego klienta Supabase powiązanego z kontekstem/locals i uwierzytelnić użytkownika, aby uzyskać jego uid dla RLS i audytu.
3. Walidacja wejścia: Zaimportować i zastosować Zod schema UpdateExpenseCommand z refine: amount_cents > 0, participant_ids unikalne i length ≥ 1, expense_date w formacie YYYY-MM-DD.
4. Autoryzacja: Sprawdzić, że użytkownik ma prawo aktualizować wskazany zasób (np. owner rozliczenia) w kodzie, a polityki RLS w DB powinny wymuszać te same reguły na poziomie danych.
5. Transakcja: Rozpocząć transakcję; SELECT ... FOR UPDATE expenses po id i settlement_id, sprawdzić, że settlement.status='open'; zaktualizować expenses (payer_participant_id, amount_cents, expense_date, description, last_edited_by) oraz wymienić powiązania w expense_participants przez DELETE/INSERT; zatwierdzić transakcję.
6. Odpowiedź: Po commit pobrać zaktualizowany rekord wraz z participants i zwrócić 200 OK w kształcie ExpenseDetailsDTO z prawidłowym Content-Type.
7. Obsługa błędów: Mapować Zod na 400, brak auth na 401, brak uprawnień na 403, brak zasobu w scope na 404, status 'closed' i inne błędy semantyczne na 422, a pozostałe na 500, nie ujawniając wrażliwych detali.
8. Logowanie i monitoring: Logować ID żądania, uid, identyfikatory zasobów i kody statusu w ustrukturyzowany sposób, bez danych wrażliwych, by wspierać detekcję anomalii i analizę incydentów.

### Załączniki techniczne

#### Schemat Zod (skrót)

- Definicję UpdateExpenseCommand w Zod z polami: payer_participant_id (uuid), amount_cents (number int positive), expense_date (string z regex YYYY-MM-DD), description (string max 140 opcjonalne), participant_ids (array uuid, min 1, unique), z refine na sumaryczne reguły.

#### Wzorzec transakcyjny

- Użyć transakcji, DELETE starych uczestników i INSERT nowych w jednej transakcji z deferrable constraints, aby spełnić regułę min. 1 uczestnik w momencie commit.
