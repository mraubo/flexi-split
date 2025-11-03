Poniżej znajduje się analiza i kompletny plan wdrożenia punktu końcowego POST /settlements/{settlement_id}/expenses zgodny ze stackiem (Astro + Supabase) oraz praktykami (Zod, RLS, poprawne kody HTTP) dla bezpiecznego i wydajnego wdrożenia w MVP oraz dalszej rozbudowy.

<analysis>
1) Kluczowe punkty specyfikacji: punkt końcowy POST /settlements/{settlement_id}/expenses tworzy wydatek wyłącznie dla rozliczenia o statusie open, zwraca 201 Created i strukturę jak GET item (ExpenseDetailsDTO), błędy: 400/401/403/404/422 zgodnie z opisem (422 m.in. dla closed settlement lub nieprawidłowych uczestników).
2) Parametry: path param settlement_id (uuid) wymagany; body wymagane: payer_participant_id (uuid istniejący w settlement), amount_cents (>0), expense_date (date), participant_ids (uuid, min 1, wszyscy w settlement); opcjonalne: description (string|null, max 140) . 
3) DTO/Command: CreateExpenseCommand (payer_participant_id, amount_cents, expense_date, description?, participant_ids), ExpenseDetailsDTO zawierający ExpenseDTO + participants: {id, nickname}, spójny z typami aplikacji.
4) Logika w service: utworzyć src/lib/services/expenses.service.ts z metodą createExpense(supabase, settlementId, command, actorId) realizującą walidację biznesową, transakcję DB (insert w expenses, insert batch w expense_participants), odczyt świeżo utworzonego ExpenseDetailsDTO, oraz publikację zdarzenia expense_added.
5) Walidacja: Zod schema dla path/body, koercja i normalizacja (np. trimming description), walidacja biznesowa (payer należy do settlement, uczestnicy istnieją i bez duplikatów, min 1 uczestnik, amount_cents > 0), mapowanie błędów do 400/422 zgodnie z semantyką HTTP.
6) Logowanie błędów: jeśli istnieje tabela błędów, rejestrować wpis z korelacją request-id i actorId; jeśli nie, logi serwera + ewentualnie wpis eventu technicznego (bez ujawniania danych wrażliwych) lub integracja z APM/Sentry, bez wpływu na wynik żądania.
7) Bezpieczeństwo: wymaga uwierzytelnienia (401), autoryzacja przez RLS/Policies w Supabase (użytkownik może działać tylko na rozliczeniach, do których należy), dodatkowe warunki RLS/DML only when settlements.status='open' oraz ograniczenie operacji na uczestnikach danego settlement, twarde walidacje po stronie DB + transakcja.
8) Scenariusze błędów: brak auth 401; brak dostępu 403; settlement/participant nie istnieje lub niewidoczny 404; body niepoprawne 400; settlement closed lub uczestnik spoza settlement 422; błąd serwera/transakcji 500, wszystkie z komunikatem i kodem błędu.
</analysis>

### Przegląd punktu końcowego

- Cel: utworzenie wydatku w ramach rozliczenia z warunkiem status='open', z odpowiedzią 201 Created i ciałem jak GET pojedynczego wydatku (ExpenseDetailsDTO).
- Lokalizacja: serwerowy endpoint Astro w src/pages/api/settlements//expenses.ts z obsługą metody POST i SSR wyłączonym prerenderowaniem (export const prerender = false).
- Autoryzacja: wymagana sesja użytkownika w kontekście locals.supabase z egzekwowaniem RLS po stronie bazy (Supabase).

### Szczegóły żądania

- Path param: settlement_id (UUID) walidowany i używany do scoping-u operacji w bazie oraz RLS.
- Body (JSON, application/json):
  - payer_participant_id: UUID (wymagany, uczestnik musi istnieć w danym settlement).
  - amount_cents: bigint/number > 0 (wymagany, liczba całkowita w groszach).
  - expense_date: string w formacie YYYY-MM-DD (wymagany).
  - description: string|null (opcjonalny, max 140 znaków, trim) .
  - participant_ids: UUID (wymagane, min 1, bez duplikatów, każdy uczestnik należy do settlement).
- Nagłówki: Content-Type: application/json, autoryzacja przez sesję Supabase (cookies) w SSR.

### Szczegóły odpowiedzi

- Sukces 201 Created z JSON ExpenseDetailsDTO: pola z expenses (id, payer_participant_id, amount_cents, expense_date, description, share_count, created_at, updated_at, last_edited_by) plus participants: .
- Lokacja: opcjonalnie nagłówek Location wskazujący zasób GET /settlements/{id}/expenses/{expense_id} (jeśli planowany), lub brak jeśli nie ma oddzielnego show endpointu.
- Błędy: JSON z pola message, code, details dla 400/401/403/404/422/500 zgodnie z semantyką MDN.

### Przepływ danych

- Wejście: żądanie POST trafia do endpointu Astro, który pobiera supabase z locals, parsuje path/body przez Zod, a następnie deleguje do expenses.service.createExpense.
- Warstwy: endpoint (I/O i mapowanie statusów) → service (logika domenowa, oryginowanie zapisu) → baza (transakcja insert expenses + insert expense_participants, triggery share_count, constraint deferrable min 1 uczestnik).
- Wyjście: po commit transakcji odczyt ExpenseDetailsDTO przez select + join na participants i expense_participants i zwrócenie 201 z payloadem.

### Względy bezpieczeństwa

- RLS: polityki wymuszające dostęp wyłącznie do wierszy settlement/participants/expenses powiązanych z auth.uid(), plus warunek DML tylko gdy settlements.status='open' w politykach/triggerach.
- Klucze: użycie supabase klienta z locals (bez ujawniania service key do przeglądarki), SSR endpoint, brak bezpośredniego dostępu z klienta do wrażliwych RPC bez RLS.
- Walidacja: Zod na wejściu ogranicza ataki typu injection/oversized payload, a DB constraints i typy zapewniają drugi poziom ochrony (defense in depth).
- HTTP: poprawne kody statusu ograniczają powierzchnię błędnej interpretacji po stronie klienta i automatyzacji (np. retry logika).

### Obsługa błędów

- 400 Bad Request: parsowanie JSON, niezgodność schematu Zod, błędny format daty lub amount_cents.
- 401 Unauthorized: brak aktywnej sesji użytkownika w locals.supabase.
- 403 Forbidden: sesja jest poprawna, ale RLS/polityki zabraniają operacji na danym settlement (np. użytkownik nie jest uczestnikiem).
- 404 Not Found: settlement lub payer/participants niewidoczni przez RLS lub nie istnieją.
- 422 Unprocessable Entity: settlement zamknięty (status != 'open'), participant spoza settlement, duplikaty participant_ids lub share_count narusza reguły biznesowe mimo poprawnego kształtu danych.
- 500 Internal Server Error: błąd transakcji DB, nieoczekiwany wyjątek serwera, problemy sieciowe lub zależności.
- Logowanie: w przypadku posiadania tabeli błędów — insert z request-id, actorId, path, payload hash i komunikatem; w przeciwnym razie log serwerowy oraz ewentualna integracja z APM, bez ujawniania danych wrażliwych w odpowiedzi.

### Wydajność

- I/O: walidacja Zod zmniejsza ilość niepotrzebnych roundtripów do DB, a jeden cykl transakcyjny obejmuje insert expense i batch insert uczestników.
- DB: wykorzystanie istniejących indeksów i triggerów utrzymujących share_count oraz constraintów deferrable dla spójności minimalizuje dodatkowe zapytania walidacyjne.
- Payload: ograniczenie description do 140 znaków i walidacja typów utrzymują mały rozmiar odpowiedzi, a selekcja participants mini DTO minimalizuje transfer.

### Kroki implementacji

1. Endpoint: utwórz plik src/pages/api/settlements//expenses.ts z export const prerender = false i eksportami POST, korzystając z SSR API Endpoints Astro.
2. Supabase w kontekście: w handlerze POST pobierz clients z context.locals.supabase, pobierz użytkownika i short-circuit 401 przy braku sesji.
3. Schematy Zod: utwórz src/types.ts/ src/lib/schemas/expenses.ts z PathSchema { settlement_id: z.string().uuid() } i BodySchema zgodnie z polami i ograniczeniami (amount_cents z.coerce.number().int().gt(0), expense_date z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/), description z.string().max(140).nullable().optional(), participant_ids z.array(z.string().uuid()).min(1), payer_participant_id z.string().uuid()).
4. Service: utwórz src/lib/services/expenses.service.ts z createExpense(supabase, settlementId, command, actorId), wyodrębnij walidację biznesową (unikalne participant_ids, payer w participant_ids opcjonalnie lub nie — zgodnie z regułami biznesowymi), oraz weryfikację przynależności do settlement przez select ograniczony RLS (lub poprzez politykę, żeby uniknąć dodatkowych roundtripów).
5. Transakcja: zrealizuj atomowo insert do expenses i expense_participants; preferowane użycie RPC (funkcji SQL) wykonywanej przez supabase.rpc('create_expense_with_participants', args) aby zapewnić transakcyjność i wykorzystać constraint deferrable/min 1 uczestnik, z kontrolą status='open' w samej funkcji i/lub RLS.
6. Zdarzenie: po powodzeniu wstaw wpis do events (event_type='expense_added', payload.env z konfiguracji, settlement_id) przez warstwę service lub dedykowany eventService, nie blokując transakcji głównej.
7. Odpowiedź: odczytaj utworzony rekord jako ExpenseDetailsDTO (join participants przez expense_participants) i zwróć 201 oraz JSON payload, opcjonalnie ustaw nagłówek Location jeśli istnieje route show.
8. Mapowanie błędów: łap ZodError → 400; brak sesji → 401; RLS denied → 403; brak rekordów widocznych → 404; naruszenia biznesowe (closed settlement, uczestnik spoza settlement, duplikaty) → 422; inne wyjątki → 500, zwracając spójny format { code, message, details? }.
9. Testy: testy kontraktowe dla 201 i wszystkich ścieżek błędów, test RLS (odmowa dla obcych rozliczeń), testy walidacji Zod (formaty i granice) oraz test idempotentności braku duplikatów participant_ids.
10. CI/CD: włącz SSR hosting kompatybilny (np. Cloudflare), skonfiguruj env (klucze Supabase) i sprawdź zgodność endpointów z Astro podczas budowy i deployu; zapisz plan jako .ai/view-implementation-plan.md w repo dla zespołu.

### Szczegóły żądania

- Metoda: POST, Content-Type: application/json, body zgodny ze schematem, uwierzytelnienie via sesja Supabase (cookies).
- Przykładowy payload minimalny: payer_participant_id, amount_cents, expense_date, participant_ids z min 1 pozycją, description opcjonalne.

### Szczegóły odpowiedzi

- 201 Created z pełnym ExpenseDetailsDTO oraz share_count wyliczanym triggerami, a participants jako mini DTO .
- Przy błędach JSON { code, message, details? } z odpowiednim statusem, bez informacji wewnętrznych o RLS lub SQL.

Wersjonowanie i rozwój schematu walidacji oraz polityk RLS należy prowadzić iteracyjnie, utrzymując jednolitą semantykę kodów HTTP i kontraktów DTO/Command, co zapewni stabilność klientów i spójność zachowania na poziomie API i bazy danych.
