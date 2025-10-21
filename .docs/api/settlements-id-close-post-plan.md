<analysis>
1) Kluczowe punkty specyfikacji API: Endpoint to POST /settlements/{id}/close, który finalizuje rozliczenie: oblicza salda i przelewy, aktualizuje status na 'closed', ustawia closed_at i zwraca JSON z polami id, status, closed_at, balances (mapa participant_id -> amount_cents) oraz transfers (lista {from,to,amount_cents}); sukces 200 OK, błędy: 401, 403, 404, 422 (gdy już zamknięte), co najlepiej zaimplementować jako bezpieczną trasę API w Astro w src/pages/api z walidacją Zod oraz egzekwowaniem uprawnień przez RLS w Supabase po stronie bazy danych.
2) Parametry: wymagany path param id (UUID rozliczenia), body puste (CloseSettlementCommand = {}), brak query params; nagłówki autoryzacji przez Supabase Auth/JWT; opcjonalnie nagłówki idempotency-key do ochrony przed wielokrotnym zamknięciem w razie retry, co jest praktyką wspieraną wzorcami projektowymi dla API.3) Niezbędne typy DTO i Command: CloseSettlementCommand (empty), SettlementSnapshotDTO (balances: Record<UUID, AmountCents>, transfers: {from,to,amount_cents}), a w odpowiedzi struktura jak w spec (id, status, closed_at, balances, transfers); do walidacji i serializacji stosować Zod w warstwie API oraz typy z src/types.ts po stronie runtime/kompilacji.4) Ekstrakcja logiki do service: stworzyć finalizeSettlementService w src/lib/services/settlements/finalizeSettlement.service.ts, który: a) sprawdza uprawnienia/stan, b) agreguje salda na bazie expenses i expense_participants, c) oblicza minimalizowane przelewy algorytmem „minimize cash flow” (greedy: największy wierzyciel kontra największy dłużnik), d) zapisuje snapshot i aktualizuje settlements (status=closed, closed_at), e) rejestruje event 'settled'; część obliczeniową można wyodrębnić do pure function calculateTransfers(balances).5) Walidacja danych wejściowych: Zod do path param (UUID), brak body; kontrola stanu w bazie: status='open', istnienie settlement i uczestników/wydatków; RLS/polityki zapewniające, że tylko uprawniony użytkownik (np. owner) może zamykać i odczytywać dane; walidacja semantyczna po stronie SQL/serwisu, a syntaktyczna po stronie API (Zod).6) Rejestrowanie błędów: centralny logger na warstwie API + opcjonalny insert do tabeli events jako zdarzenie błędu z payload zawierającym env i kontekst, zgodny z wzorcem „Polityki i zdarzenia” używanym z RLS (nie eksponować danych wrażliwych); integracja z RLS pozwala utrzymać spójność kontekstu użytkownika.
7) Zagrożenia bezpieczeństwa: brak RLS skutkuje wyciekiem danych; potrzeba polityk ograniczających UPDATE settlements do właściciela i tylko dla status='open'; ochrona przed race condition (podwójne zamknięcie) transakcją i blokadą; walidacja wejścia Zod chroni przed błędami/atakami; ograniczenie ekspozycji API do autoryzowanych użytkowników; Cloudflare WAF/rate limiting jako warstwa ochronna.
8) Scenariusze błędów i kody: 400 dla nieprawidłowego UUID/idempotency-key; 401 gdy brak JWT; 403 gdy użytkownik nie ma prawa zamykać tego settlement (RLS/polityki); 404 gdy settlement nie istnieje lub jest niewidoczny w RLS; 422 gdy już closed; 500 dla błędów nieoczekiwanych/transakcyjnych; to zgodne ze wzorcami API i dokumentacją praktyk walidacji/obsługi w Astro+Zod.
</analysis>

# .ai/view-implementation-plan.md

### Przegląd punktu końcowego
Endpoint finalizuje rozliczenie: oblicza salda na podstawie wydatków i uczestników, minimalizuje liczbę/przepływ przelewów, utrwala snapshot, ustawia status 'closed' i zwraca wynikową strukturę z balansami oraz transferami.

Jest to trasa POST w Astro: src/pages/api/settlements/[id]/close.ts, z walidacją Zod path param, autoryzacją Supabase Auth oraz egzekwowaniem uprawnień przez RLS w Supabase na tabelach settlements/expenses/participants.

Sukces zwraca 200 z JSON: { id, status: 'closed', closed_at, balances: Record<UUID,AmountCents>, transfers: Array<{from,to,amount_cents}> }, natomiast body żądania jest puste, a identyfikator rozliczenia pochodzi z parametru ścieżki.

### Szczegóły żądania
- HTTP: POST /settlements/{id}/close, gdzie {id} to UUID rozliczenia walidowany Zod-em oraz sprawdzany w bazie w kontekście RLS/autoryzacji.
- Headers: Authorization: Bearer <access_token Supabase>, Content-Type: application/json, opcjonalnie Idempotency-Key do bezpiecznych retry i deduplikacji operacji.
- Body: pusty obiekt {} zgodny z CloseSettlementCommand; wszelka logika i dane pochodzą z bazy (participants, expenses, expense_participants).

Walidacja wejścia (warstwa API): parse UUID z path, reject gdy nie UUID (400), oraz early return gdy brak tokena (401) przed dotykaniem bazy.
### Szczegóły odpowiedzi
- 200 OK: JSON zawiera id rozliczenia, status 'closed', closed_at (timestamptz), balances (mapa participant_id -> amount_cents, dodatnie = należne, ujemne = do zapłaty), transfers (lista {from,to,amount_cents} minimalizująca przepływ).
- 401 Unauthorized: brak/nieprawidłowy token lub sesja; RLS i warstwa API odrzucają dostęp.
- 403 Forbidden: użytkownik nie spełnia polityki zamykania (np. nie jest właścicielem); zadziała RLS na UPDATE settlements lub kontrola serwisowa.
- 404 Not Found: brak rozliczenia o podanym id w kontekście RLS, więc rekord nie istnieje dla zapytającego.
- 422 Unprocessable Entity: rozliczenie już zamknięte; reguła biznesowa i blokada idempotencji.
- 500 Internal Server Error: nieprzewidziany błąd transakcji/algorytmu/zapisu snapshotu.

### Przepływ danych
- Wejście: identyfikator rozliczenia z path, kontekst użytkownika z JWT Supabase, brak danych w body; middleware dostarcza supabase klienta przez locals do handlera.
- Serwis finalizeSettlementService pobiera uczestników i wydatki, wylicza netto salda per participant, uruchamia algorytm minimalizacji przelewów i tworzy snapshot; wszystko w transakcji, po czym aktualizuje status i closed_at.
- Wyjście: struktura z saldami i przelewami odczytana z nowo utworzonego snapshotu (źródło prawdy), która jest mapowana na DTO odpowiedzi i zwracana jako 200.

### Względy bezpieczeństwa
- Wymuś RLS na wszystkich tabelach publicznych; zdefiniuj politykę SELECT/UPDATE dla settlements tak, aby tylko właściciel mógł zamknąć rozliczenie i odczytać stan, oraz polityki SELECT dla expenses/participants ograniczone do powiązanego settlement.
- Egzekwuj autoryzację przez Supabase Auth JWT; handler odrzuca bez ważnego tokena (401), a RLS zapewnia „defense in depth” na poziomie bazy.
- Ogranicz race conditions: transakcyjnie sprawdź status='open' i zaktualizuj na 'closed' z SELECT ... FOR UPDATE / blokadą, aby zapobiec równoczesnemu zamykaniu i phantom reads.
- Walidacja Zod path param i nagłówków, sanity-check wartości kwotowych i UUID-ów, a także twarde typowanie DTO; sanitacja danych wyjściowych ze snapshotu przed zwrotem.- Warstwa brzegowa: Cloudflare WAF/rate limiting na ścieżce POST /settlements/*/close, by ograniczyć brute force i nadużycia; logowanie i korelacja żądań.

### Obsługa błędów
- 400: nieprawidłowy UUID lub Idempotency-Key; zwróć strukturę { code, message, details }, loguj błąd walidacji po stronie serwera bez danych wrażliwych.
- 401: brak/nieprawidłowy token; nie ujawniaj, czy settlement istnieje; zwróć komunikat ogólny i zakończ.
- 403: polityki RLS/serwis odrzuciły próbę zamknięcia; komunikat ogólny bez ujawniania reguł; koreluj ze zdarzeniem audytowym.
- 404: nie istnieje lub niedostępne w RLS; nie zdradzaj istnienia zasobu; 404 ma pierwszeństwo nad 403 dla niejawności.
- 422: status != 'open' (już zamknięte) albo brak danych do wyliczenia (np. zero uczestników wskutek niespójności); komunikat kierunkowy dla klienta.
- 500: rollback transakcji, rejestracja w loggerze; zwróć identyfikator błędu do śledzenia i rekomendację retry tylko przy braku idempotency-key.

Dziennikowanie: log na poziomie API (kontekst request-id, user-id, settlement-id), oraz event 'settled' do tabeli events po sukcesie; przy błędach krytycznych opcjonalnie event diagnostyczny z env w payload.

### Wydajność
- Użyj indeksów istniejących per settlement_id na expenses/expense_participants/participants; agregacje sald wykonuj w SQL z proper JOIN i GROUP BY, by ograniczyć transfer danych do aplikacji.
- Algorytm transferów realizuj po stronie serwisu na już policzonych balansach; greedy „minimize cash flow” działa w czasie O(n log n) przy użyciu dwóch kolejek/posortowanych list dłużników i wierzycieli.
- Twórz snapshot tylko raz na zamknięcie (UNIQUE by settlement_id), a odpowiedź opieraj na snapshotcie, by uniknąć powtórnych kosztownych obliczeń i umożliwić idempotencję.

### Kroki implementacji
1) Schematy Zod: CloseSettlementParamsSchema (id: uuid), CloseSettlementBodySchema (puste {}), CloseSettlementResponseSchema z balances/transfers; umieść w src/lib/schemas/settlements.close.ts i współdziel z typami z src/types.ts.2) RLS/polityki: w Supabase włącz RLS i dodaj polityki na settlements: SELECT/UPDATE tylko dla owner_id = auth.uid(), oraz SELECT na expenses/participants powiązanych settlement_id; przetestuj polityki poprzez sesję serwerową z JWT.
3) Warstwa danych (SQL): napisz widok lub CTE do wyliczenia sald netto: suma udziałów - suma wpłat płacących po uczestnikach; zwróć per participant_id amount_cents; agregację wykonywać w transakcji.
4) Algorytm przelewów: zaimplementuj calculateTransfers(balances) w TS (greedy: wybierz max creditor i max debtor, przelej min(|neg|, pos), aktualizuj, powtarzaj aż do zera); zapewnij deterministyczne sortowanie wejścia dla stabilności .  
5) Serwis finalizeSettlementService: sprawdź istnienie i status='open' z blokadą; policz balances SQL-em; policz transfers w TS; w transakcji: wstaw settlement_snapshots (balances, transfers, algorithm_version), zaktualizuj settlements.status='closed', closed_at=now(), last_edited_by=auth.uid(); wstaw event 'settled' z payload.env.
6) Handler API: src/pages/api/settlements/[id]/close.ts — SSR off (prerender=false), pobierz supabase z context.locals, waliduj parametry Zod, autoryzuj, wywołaj serwis, mapuj wynik na response DTO, zwróć 200; mapuj wyjątki na 400/401/403/404/422/500.7) Idempotencja i konkurencja: użyj nagłówka Idempotency-Key z deduplikacją na poziomie DB (np. tabela idempotency z unikatem per user+settlement+key) lub opieraj się na UNIQUE(snapshot.settlement_id) i bezpiecznej transakcji; zwracaj istniejący snapshot przy powtórzeniach.
8) Testy: jednostkowe dla calculateTransfers (zestawy dłużnik/wierzyciel), integracyjne dla serwisu z bazą (RLS on), E2E dla handlera API; przypadki: brak uprawnień (403), nieistniejący (404), już zamknięty (422), sukces (200).
9) Observability: strukturalne logi JSON, korelacja request-id, metryki czasu transakcji/size transfers, alerty 5xx; w razie błędów zapis eventów z env.
10) Deploy: CI/CD z GitHub Actions, środowisko Cloudflare; konfiguracja ENV (Supabase URL/KEY), migracje SQL dla polityk/indeksów/funkcji; smoke test po wdrożeniu.
