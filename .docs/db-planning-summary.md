<conversation_summary>
<decisions>

1. Rezygnacja z tworzenia tabeli `profiles` jako lustrzanego rozszerzenia `auth.users`.
2. Brak partycjonowania tabeli `events` na potrzeby MVP.
3. Dodanie kontekstu środowiska w `events.payload.env` (wymagane pole).
4. Dodanie kolumny `currency` z domyślną wartością `PLN` (przygotowanie pod wielowalutowość).
5. Dodanie pola `title varchar(100)` dla rozliczeń.
6. Pozostałe rekomendacje — zaakceptowane bez zmian.
   </decisions>

<matched_recommendations>

1. Klucze główne jako `uuid` generowane `gen_random_uuid()` dla wszystkich głównych encji.
2. Encje: `settlements`, `participants`, `expenses`, `expense_participants`, `settlement_snapshots`, `events`.
3. Własność i status rozliczeń: `settlements(owner_id uuid references auth.users, status enum open|closed, closed_at timestamptz)`.
4. Właściciel jest uczestnikiem: `participants.is_owner boolean` + unikalność jednego właściciela per `settlement_id`.
5. Uczestnicy: `nickname` + `nickname_norm` (lower) z CHECK wzorca `^[a-z0-9_-]+$` oraz unikalność `(settlement_id, nickname_norm)`.
6. Limity: do 10 uczestników i do 500 wydatków na rozliczenie — wymuszane constraint triggerami.
7. Kwoty w groszach: `amount_cents bigint` z CHECK `> 0`; daty w `date`, audyt w `timestamptz`.
8. Płacący jako FK do `participants`, dozwolone wykluczenie z podziału; domyślnie włączony.
9. Udziały: tabela łącznikowa `expense_participants(expense_id, participant_id)` z unikalnością pary i walidacją min. 1 uczestnika.
10. Denormalizacja: `expenses.share_count int` utrzymywane triggerem; liczniki `participants_count` i `expenses_count` w `settlements`.
11. Stabilne sortowanie list: `ORDER BY expense_date, created_at, id` i zgodne indeksy.
12. Snapshocie wyników dla `closed`: `settlement_snapshots(balances jsonb, transfers jsonb, created_at)`.
13. Finalizacja: funkcja `finalize_settlement(settlement_id)` w transakcji z `SELECT ... FOR UPDATE`, walidacjami i snapshotem.
14. Zabezpieczenia edycji po zamknięciu: RLS + triggery odrzucające `UPDATE/DELETE` gdy `status='closed'`.
15. RLS: pełny dostęp tylko dla właściciela (`auth.uid()`), także dla `participants`, `expenses`, `expense_participants`, `events` i `settlement_snapshots`.
16. Indeksy pod główne zapytania (m.in. `settlements(owner_id, status, created_at desc)`, `expenses(settlement_id, expense_date, created_at)`, `expenses(payer_participant_id)`, `expense_participants(participant_id, expense_id)`).
17. Zdarzenia analityczne: `events(event_type CHECK IN [...], settlement_id, actor_id, payload jsonb, created_at)`; `payload` zawiera obligatoryjnie `env`.
18. Walidacje spójności: zgodność `payer_participant_id` i udziałów z tym samym `settlement_id`; kontrola sum w algorytmie nettingu.
    </matched_recommendations>

<database_planning_summary>

- Główne wymagania schematu:
  - Rozliczenia z workflow `open → closed`, twarde usuwanie tylko dla archiwalnych; blokada edycji po zamknięciu.
  - Kwoty w groszach (`bigint`), prezentacja w UI w `pl-PL`.
  - Limity: ≤10 uczestników, ≤500 wydatków; unikalne nicki w ramach rozliczenia (case-insensitive).
  - Generowanie stabilnego bilansu i listy przelewów; snapshot przy zamknięciu.
  - Audyt: `created_at`, `updated_at` (trigger), `last_edited_by` (z `auth.uid()`).
  - Zdarzenia analityczne z minimalnym kontekstem i `payload.env`.

- Kluczowe encje i relacje:
  - `settlements`: `id`, `owner_id`, `status enum`, `title varchar(100)`, `currency char(3) default 'PLN'`, liczniki, `created_at/updated_at/closed_at`, `last_edited_by`.
  - `participants`: `id`, `settlement_id`, `nickname`, `nickname_norm GENERATED`, `is_owner boolean` (unikalny właściciel w rozliczeniu), audyt.
  - `expenses`: `id`, `settlement_id`, `payer_participant_id` (FK), `amount_cents bigint`, `expense_date date`, `description varchar(140)`, `share_count int`, audyt.
  - `expense_participants`: `(expense_id, participant_id)` unikalne pary; spójność z `settlement_id`.
  - `settlement_snapshots`: `settlement_id`, `balances jsonb`, `transfers jsonb`, `created_at`.
  - `events`: `id`, `event_type` (zbiór dozwolony), `settlement_id`, `actor_id`, `payload jsonb` z obowiązkowym `env`, `created_at`.
  - Relacje: 1:N `settlements`→`participants`; 1:N `settlements`→`expenses`; N:M `expenses`↔`participants` przez `expense_participants`.

- Bezpieczeństwo i skalowalność:
  - RLS: właściciel ma wyłączny dostęp (SELECT/INSERT/UPDATE/DELETE) do danych własnych rozliczeń; zmiany dozwolone tylko gdy `status='open'`.
  - Triggery blokujące edycje po zamknięciu i modyfikację `owner_id`.
  - Indeksy wspierające listy, filtrowanie po osobie (płacący i uczestnik), stabilne sortowanie.
  - Brak partycjonowania `events` w MVP; planowana możliwość późniejszej migracji.
  - Denormalizowane liczniki dla wydajnego listowania; snapshoty dla `closed` ograniczają koszt zapytań.
  - `currency` na poziomie `settlements` (domyślnie `PLN`) — przygotowanie pod wielowalutowość.

- Dodatkowe mechanizmy:
  - Funkcja `finalize_settlement` (transakcyjna), algorytm nettingu deterministyczny, kontrola sum.
  - Constraint triggery: limity liczebności, min. 1 uczestnik w każdym wydatku, spójność `settlement_id` między tabelami.
  - Stabilne ORDER BY i zgodne indeksy, m.in. `(settlement_id, expense_date, created_at, id)`.
    </database_planning_summary>

<unresolved_issues>

1. `name` vs `title` dla `settlements`: używamy tylko `title` czy oba pola? Rekomendacja: wybrać jedno (`title`) i porzucić `name`.
2. Lokalizacja kolumny `currency`: wyłącznie w `settlements` (dziedziczona logicznie przez `expenses`) czy także w `expenses`? Rekomendacja: tylko `settlements` + CHECK, by w danym rozliczeniu waluta była jednorodna.
3. Dokładny zbiór wartości `events.event_type` (enum/whitelist): finalna lista do osadzenia w CHECK.
4. Wersjonowanie algorytmu w snapshotach (np. `algorithm_version` w `settlement_snapshots`) — czy przechowujemy?
5. Czy `description` w `expenses` dopuszcza znaki emoji/Unicode rozszerzony (implikacja kolacji/indeksów)?
6. Czy wymagamy CITEXT zamiast `nickname_norm` (rozszerzenie) czy zostajemy przy kolumnie generowanej i CHECK?
   </unresolved_issues>
   </conversation_summary>
