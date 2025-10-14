## FlexiSplit — PostgreSQL schema plan (MVP)

### 1. Lista tabel z kolumnami, typami i ograniczeniami

#### 1.0 `auth.users` (zarządzana przez Supabase Auth)

- Tabela zarządzana przez Supabase Auth; źródło użytkowników logujących się do aplikacji. Struktura jest przybliżona i może różnić się między wersjami Supabase.
- **id**: uuid, PK
- **email**: varchar(255), NOT NULL, UNIQUE
- **encrypted_password**: text, NOT NULL
- **created_at**: timestamptz, NOT NULL, default `now()`
- **confirmed_at**: timestamptz, NULL

Powiązania (użycie w aplikacji):

- Referencje FK z tabel: `settlements.owner_id`, `events.actor_id`, pola audytu `last_edited_by` w `settlements`/`participants`/`expenses`.

#### 1.1 `settlements`

- **id**: uuid, PK, default `gen_random_uuid()`
- **owner_id**: uuid, NOT NULL, FK → `auth.users(id)` (ON DELETE RESTRICT)
- **title**: varchar(100), NOT NULL
- **status**: text, NOT NULL, CHECK in ('open','closed'), default 'open'
- **currency**: char(3), NOT NULL, default 'PLN'
- **participants_count**: int, NOT NULL, default 0, CHECK `participants_count >= 0`
- **expenses_count**: int, NOT NULL, default 0, CHECK `expenses_count >= 0`
- **created_at**: timestamptz, NOT NULL, default `now()`
- **updated_at**: timestamptz, NOT NULL, default `now()`
- **closed_at**: timestamptz, NULL
- **last_edited_by**: uuid, NULL, FK → `auth.users(id)`

Constraints and behaviors:

- Status przejść: `open → closed` (brak ponownego otwarcia w MVP).
- Brak Hard delete.
- Zmiana `owner_id` po wstawieniu jest zablokowana (trigger BEFORE UPDATE).
- Limit maks. 3 aktywne (`status='open'`) rozliczenia na użytkownika (constraint trigger AFTER INSERT/UPDATE of status).

#### 1.2 `participants`

- **id**: uuid, PK, default `gen_random_uuid()`
- **settlement_id**: uuid, NOT NULL, FK → `settlements(id)` (ON DELETE CASCADE)
- **nickname**: varchar(30), NOT NULL, CHECK `nickname ~ '^[a-z0-9_-]+$'`
- **nickname_norm**: text, GENERATED ALWAYS AS `lower(nickname)` STORED
- **is_owner**: boolean, NOT NULL, default false
- **created_at**: timestamptz, NOT NULL, default `now()`
- **updated_at**: timestamptz, NOT NULL, default `now()`
- **last_edited_by**: uuid, NULL, FK → `auth.users(id)`

Constraints and behaviors:

- Unikalność nicków per rozliczenie: UNIQUE(`settlement_id`, `nickname_norm`).
- Wspierająca spójność kompozytowa: UNIQUE(`settlement_id`, `id`) (do FKs złożonych).
- Dokładnie jeden właściciel per rozliczenie: UNIQUE(`settlement_id`) WHERE `is_owner = true` (partial unique index).
- Operacje DML dozwolone tylko, gdy `settlements.status='open'` (trigger/constraint, oraz RLS policy).

#### 1.3 `expenses`

- **id**: uuid, PK, default `gen_random_uuid()`
- **settlement_id**: uuid, NOT NULL, FK → `settlements(id)`
- **payer_participant_id**: uuid, NOT NULL, FK (kompozytowa zgodność z `participants` — patrz constraint)
- **amount_cents**: bigint, NOT NULL, CHECK `amount_cents > 0`
- **expense_date**: date, NOT NULL
- **description**: varchar(140), NULL
- **share_count**: int, NOT NULL, default 0, CHECK `share_count >= 0` (utrzymywane triggerem)
- **created_at**: timestamptz, NOT NULL, default `now()`
- **updated_at**: timestamptz, NOT NULL, default `now()`
- **last_edited_by**: uuid, NULL, FK → `auth.users(id)`

Constraints and behaviors:

- Spójność płacącego z rozliczeniem: FK(`settlement_id`, `payer_participant_id`) → `participants(settlement_id, id)`.
- Min. 1 uczestnik w podziale: constraint trigger DEFERRABLE (sprawdzany po DML na `expense_participants`).
- Operacje DML dozwolone tylko, gdy `settlements.status='open'`.

#### 1.4 `expense_participants`

- **expense_id**: uuid, NOT NULL
- **participant_id**: uuid, NOT NULL
- **settlement_id**: uuid, NOT NULL
- **created_at**: timestamptz, NOT NULL, default `now()`

Keys and constraints:

- PK: (`expense_id`, `participant_id`).
- FK(`expense_id`, `settlement_id`) → `expenses(id, settlement_id)`.
- FK(`participant_id`, `settlement_id`) → `participants(id, settlement_id).
- Unikalność pary uczestnictwa: PK wymusza brak duplikatów.
- Operacje DML dozwolone tylko, gdy `settlements.status='open'`.

Behaviors:

- Triggery AFTER INSERT/DELETE/UPDATE utrzymują `expenses.share_count`.
- Constraint trigger DEFERRABLE pilnujący, aby każdy `expense` miał ≥1 uczestnika.

#### 1.5 `settlement_snapshots`

- **id**: uuid, PK, default `gen_random_uuid()`
- **settlement_id**: uuid, NOT NULL, FK → `settlements(id)`
- **balances**: jsonb, NOT NULL  
  Struktura: mapowanie `participant_id -> amount_cents` (bigint w groszach; saldo dodatnie = należne do otrzymania, ujemne = do zapłaty).
- **transfers**: jsonb, NOT NULL  
  Struktura: tablica obiektów `{ from: uuid, to: uuid, amount_cents: bigint }`, posortowana stabilnie.
- **algorithm_version**: int, NOT NULL, default 1
- **created_at**: timestamptz, NOT NULL, default `now()`

Constraints and behaviors:

- Snapshoty powstają tylko przy finalizacji rozliczenia (funkcja `finalize_settlement`).
- Opcjonalnie UNIQUE(`settlement_id`) jeśli trzymamy jeden snapshot per closed (MVP może przyjąć jeden).

#### 1.6 `events`

- **id**: uuid, PK, default `gen_random_uuid()`
- **event_type**: text, NOT NULL, CHECK IN (
  'settlement_created',
  'participant_added',
  'expense_added',
  'settle_confirmed',
  'settled',
  'summary_copied',
  'new_settlement_started'
  )
- **settlement_id**: uuid, NULL, FK → `settlements(id)` (ON DELETE SET NULL) — niektóre zdarzenia mogą być globalne.
- **actor_id**: uuid, NULL, FK → `auth.users(id)`
- **payload**: jsonb, NOT NULL, CHECK `(payload ? 'env') AND (payload->>'env') IN ('dev','prod')`
- **created_at**: timestamptz, NOT NULL, default `now()`

Constraints and behaviors:

- Minimalny kontekst w `payload`; wymagane `env`.
- Indeksy wspierają analizę lejkową i raporty.

---

### 2. Relacje między tabelami (kardynalność)

- **`auth.users` 1:N `settlements`** — właściciel przez `owner_id` (brak modyfikacji w `auth.users`).
- **`auth.users` 1:N `events`** — aktor zdarzenia przez `actor_id` (opcjonalnie NULL).
- **`auth.users` 1:N pola audytu** — `last_edited_by` w `settlements`, `participants`, `expenses` (NULLable).
- **`settlements` 1:N `participants`** — każdy uczestnik należy do dokładnie jednego rozliczenia; dokładnie jeden `participants.is_owner = true` na rozliczenie.
- **`settlements` 1:N `expenses`** — każdy wydatek należy do jednego rozliczenia.
- **`participants` 1:N `expenses` (payer)** — płacący jest jednym z uczestników danego rozliczenia; spójność wymuszona FK złożonym.
- **`expenses` N:M `participants`** przez tabelę **`expense_participants`** — uczestnicy biorą udział w podziale wydatku.
- **`settlements` 1:N `settlement_snapshots`** — MVP: 1 snapshot na `closed` (możliwość rozszerzenia do wersjonowania).
- **`settlements` 1:N `events`** (opcjonalnie NULL dla zdarzeń globalnych).

---

### 3. Indeksy

- `auth.users` (zarządzana przez Supabase)
  - PK (`id`), UNIQUE (`email`) — dostarczane przez Supabase Auth.
- `settlements`
  - BTREE (`owner_id`, `status`, `created_at` DESC) — listowanie aktywnych/archiwalnych z sortowaniem.
  - BTREE (`status`, `created_at`) — pomocniczy.
  - PARTIAL UNIQUE (`owner_id`) WHERE `status='open'` ograniczałby do 1, ale MVP wymaga limitu 3 — zastosujemy trigger limitujący do 3 (patrz niżej).
- `participants`
  - UNIQUE (`settlement_id`, `nickname_norm`).
  - UNIQUE (`settlement_id`) WHERE `is_owner = true` — wymusza jednego właściciela.
  - UNIQUE (`settlement_id`, `id`) — wsparcie dla FKs kompozytowych.
  - BTREE (`settlement_id`, `created_at`).
- `expenses`
  - BTREE (`settlement_id`, `expense_date`, `created_at`, `id`) — stabilne sortowanie list i grupowanie po dacie.
  - BTREE (`payer_participant_id`) — filtr „po osobie” jako płacący.
  - BTREE (`settlement_id`, `payer_participant_id`).
- `expense_participants`
  - BTREE (`participant_id`, `expense_id`) — filtr „po osobie” jako uczestnik.
  - BTREE (`expense_id`).
  - BTREE (`settlement_id`, `participant_id`).
- `events`
  - BTREE (`settlement_id`, `created_at`).
  - BTREE (`event_type`, `created_at`).
  - BTREE (`actor_id`, `created_at`).
- `settlement_snapshots`
  - UNIQUE (`settlement_id`) — jeśli wymuszamy pojedynczy snapshot.

---

### 4. Zasady PostgreSQL (RLS) i bezpieczeństwo

Wszystkie tabele mają włączone RLS. Poniżej polityki (Supabase: `auth.uid()`):

Uwaga: `auth.users` jest zarządzana przez Supabase Auth (GoTrue). Nie wprowadzamy w niej zmian ani własnych zasad RLS w aplikacji; identyfikacja użytkownika odbywa się poprzez `auth.uid()` używane w politykach pozostałych tabel.

- `settlements`
  - SELECT: `owner_id = auth.uid()`
  - INSERT: `new.owner_id = auth.uid()`
  - UPDATE: `owner_id = auth.uid()` AND `status = 'open'`
  - DELETE: `owner_id = auth.uid()` AND `status = 'closed'`

- `participants`
  - SELECT: istnieje `settlements` z `participants.settlement_id = settlements.id` i `settlements.owner_id = auth.uid()`
  - INSERT/UPDATE/DELETE: jw. oraz `settlements.status = 'open'`

- `expenses`
  - SELECT: jw. jak wyżej przez `settlement_id`
  - INSERT/UPDATE/DELETE: jw. oraz `settlements.status = 'open'`

- `expense_participants`
  - SELECT: jw. przez `settlement_id`
  - INSERT/UPDATE/DELETE: jw. oraz `settlements.status = 'open'`

- `settlement_snapshots`
  - SELECT: jw. przez `settlement_id`
  - INSERT: zabronione bezpośrednio; dozwolone wyłącznie przez funkcję `finalize_settlement` (SECURITY DEFINER)
  - UPDATE/DELETE: zabronione w MVP

- `events`
  - SELECT: jeśli `settlement_id` nie-NULL: jw. przez `settlement_id`; zdarzenia globalne (NULL) opcjonalnie ukryte albo widoczne dla właściciela `actor_id = auth.uid()`
  - INSERT: `actor_id = auth.uid()` oraz CHECK payload.env ∈ {'dev','prod'}
  - UPDATE/DELETE: zabronione

Dodatkowe zabezpieczenia i triggery:

- BEFORE UPDATE na `settlements`: blokuje zmianę `owner_id`; ustawia `updated_at`, `last_edited_by`.
- BEFORE UPDATE na `participants`/`expenses`/`expense_participants`: ustawia `updated_at`, `last_edited_by`.
- BEFORE INSERT/UPDATE/DELETE na `participants`/`expenses`/`expense_participants`: odrzuca modyfikacje, gdy `settlements.status='closed'`.
- AFTER INSERT/UPDATE `participants`: aktualizuje licznik `settlements.participants_count`.
- AFTER INSERT/DELETE `expenses`: aktualizuje licznik `settlements.expenses_count`.
- AFTER INSERT/DELETE/UPDATE `expense_participants`: aktualizuje `expenses.share_count`.
- DEFERRABLE CONSTRAINT TRIGGER: minimalnie 1 uczestnik na `expense`.
- DEFERRABLE CONSTRAINT TRIGGER: limit ≤10 `participants` na `settlement`.
- DEFERRABLE CONSTRAINT TRIGGER: limit ≤500 `expenses` na `settlement`.
- DEFERRABLE CONSTRAINT TRIGGER: maks. 3 `open` `settlements` na `owner_id`.

---

### 5. Uwagi projektowe i uzasadnienia

- **Waluta i kwoty**: wartości finansowe w groszach (`bigint`) zgodnie z PRD; `currency` na poziomie `settlements` (default 'PLN').
- **Nicki uczestników**: walidacja wzorca i kolumna znormalizowana `nickname_norm` zapewniają unikalność case-insensitive bez rozszerzeń CITEXT.
- **Denormalizacja**: `expenses.share_count` oraz liczniki w `settlements` przyspieszają listowanie i filtrowanie; utrzymywane triggerami.
- **Spójność międzytabelowa**: FKs kompozytowe wymuszają zgodność `settlement_id` przy płacącym i udziale w wydatkach.
- **Stabilne sortowanie list**: indeks `expenses(settlement_id, expense_date, created_at, id)` wspiera sort `expense_date, created_at, id` i grupowanie po dacie.
- **Finalizacja**: funkcja `finalize_settlement(settlement_id)` (w transakcji z `SELECT ... FOR UPDATE`) liczy salda, wyznacza minimalny zestaw przelewów (netting), zapisuje snapshot, ustawia `status='closed'` i `closed_at`. Dostępna tylko dla właściciela; działa jako SECURITY DEFINER.
- **Usuwanie**: dozwolone wyłącznie dla rozliczeń `closed`; kaskady usuwają powiązane rekordy.
- **Zdarzenia analityczne**: whitelist `event_type` oraz obowiązkowe `payload.env` pozwalają na prostą filtrację środowisk (dev/prod) i analizę lejka.
