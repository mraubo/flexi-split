Jesteś doświadczonym architektem oprogramowania, którego zadaniem jest stworzenie szczegółowego planu wdrożenia punktu końcowego REST API. Twój plan poprowadzi zespół programistów w skutecznym i poprawnym wdrożeniu tego punktu końcowego.

Zanim zaczniemy, zapoznaj się z poniższymi informacjami:

1. Route API specification:
<route_api_specification>
#### PUT /settlements/{id}

- **Description**: Update settlement (only title, only if status='open')
- **Request Body**:

```json
{
  "title": "string (max 100 chars, required)"
}
```

- **Response Structure**: Same as GET /settlements item
- **Success Codes**: 200 OK
- **Error Codes**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity (closed settlement)
</route_api_specification>

2. Related database resources:
<related_db_resources>
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

- Spójność płacącego z rozliczeniem: FK(`settlement_id`, `payer_participant_id`) → `expenses(id, settlement_id)`.
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
  - BTREE (`payer_participant_id`) — filtr „po osobie" jako płacący.
  - BTREE (`settlement_id`, `payer_participant_id`).
- `expense_participants`
  - BTREE (`participant_id`, `expense_id`) — filtr „po osobie" jako uczestnik.
  - BTREE (`expense_id`).
  - BTREE (`settlement_id`, `participant_id`).
- `events`
  - BTREE (`settlement_id`, `created_at`).
  - BTREE (`event_type`, `created_at`).
  - BTREE (`actor_id`, `created_at`).
- `settlement_snapshots`
  - UNIQUE (`settlement_id`) — jeśli wymuszamy pojedynczy snapshot.

---
</related_db_resources>

3. Definicje typów:
<type_definitions>
import type { Tables } from "@/db/database.types";

// Shared foundational scalar aliases. These align with DB column types but
// provide semantic meaning across DTOs and command models.
export type UUID = string;
export type TimestampString = string;
export type DateString = string;
export type AmountCents = number;

export type SortOrder = "asc" | "desc";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PagedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// Base DB row bindings for derivation. These keep DTOs connected to entities.
type SettlementRow = Tables<"settlements">;
type ParticipantRow = Tables<"participants">;
type ExpenseRow = Tables<"expenses">;
type SettlementSnapshotRow = Tables<"settlement_snapshots">;
type EventRow = Tables<"events">;

// -----------------------------
// Settlements - DTOs
// -----------------------------

// Summary DTO returned by list/detail endpoints
export type SettlementSummaryDTO = Pick<
  SettlementRow,
  | "id"
  | "title"
  | "status"
  | "currency"
  | "participants_count"
  | "expenses_count"
  | "created_at"
  | "updated_at"
  | "closed_at"
  | "last_edited_by"
>;

// Detail is the same structure per API plan
export type SettlementDetailsDTO = SettlementSummaryDTO;

// -----------------------------
// Participants - DTOs
// -----------------------------

export type ParticipantDTO = Pick<
  ParticipantRow,
  "id" | "nickname" | "is_owner" | "created_at" | "updated_at" | "last_edited_by"
>;

// -----------------------------
// Expenses - DTOs
// -----------------------------

export type ExpenseParticipantMiniDTO = Pick<ParticipantRow, "id" | "nickname">;

export type ExpenseDTO = Pick<
  ExpenseRow,
  | "id"
  | "payer_participant_id"
  | "amount_cents"
  | "expense_date"
  | "description"
  | "share_count"
  | "created_at"
  | "updated_at"
  | "last_edited_by"
> & {
  participants: ExpenseParticipantMiniDTO[];
};

export type ExpenseDetailsDTO = ExpenseDTO;

// -----------------------------
// Settlement Snapshots - DTOs
// -----------------------------

export type BalancesMap = Record<UUID, AmountCents>;

export interface TransferDTO {
  from: UUID;
  to: UUID;
  amount_cents: AmountCents;
}

// The snapshot row stores balances/transfers as JSON; in the API they are
// exposed as strongly typed structures below.
export type SettlementSnapshotDTO = Pick<
  SettlementSnapshotRow,
  "settlement_id" | "algorithm_version" | "created_at"
> & {
  balances: BalancesMap;
  transfers: TransferDTO[];
};

// -----------------------------
// Events - DTOs
// -----------------------------

export type EventType =
  | "settlement_created"
  | "participant_added"
  | "expense_added"
  | "settle_confirmed"
  | "settled"
  | "summary_copied"
  | "new_settlement_started";

export type EventEnv = "dev" | "prod";

export interface EventPayload {
  env: EventEnv;
  additional_data?: Record<string, unknown>;
  // Allow future extensibility without breaking consumers
  [key: string]: unknown;
}

export type EventDTO = Pick<EventRow, "id" | "event_type" | "settlement_id" | "created_at"> & {
  payload: EventPayload;
};

// -----------------------------
// Command and Query Models
// -----------------------------

export type SettlementSortBy = "created_at" | "updated_at" | "title";

// Settlements
export interface GetSettlementsQuery {
  status?: "open" | "closed";
  page?: number;
  limit?: number;
  sort_by?: SettlementSortBy;
  sort_order?: SortOrder;
}

export interface CreateSettlementCommand {
  title: string; // validated: required, max 100 chars
}

export interface UpdateSettlementCommand {
  title: string; // validated: required, max 100 chars
}

export type CloseSettlementCommand = Record<string, never>; // empty body

// Participants (scoped to a settlement via path params)
export interface GetParticipantsQuery {
  page?: number;
  limit?: number;
}

export interface CreateParticipantCommand {
  nickname: string; // validated: 3-30 chars, ^[a-z0-9_-]+$, case-insensitive unique per settlement
}

export interface UpdateParticipantCommand {
  nickname: string; // same validation as create
}

// Expenses (scoped to a settlement via path params)
export interface GetExpensesQuery {
  participant_id?: UUID; // filter by payer or participant
  date_from?: DateString; // YYYY-MM-DD
  date_to?: DateString; // YYYY-MM-DD
  page?: number;
  limit?: number;
  sort_by?: ExpenseSortBy;
  sort_order?: SortOrder;
}

type ExpenseCreateBase = Pick<ExpenseRow, "payer_participant_id" | "amount_cents" | "expense_date"> & {
  // Optional per API, nullable in DB
  description?: ExpenseRow["description"];
};

export type CreateExpenseCommand = ExpenseCreateBase & {
  participant_ids: UUID[]; // required, min 1, all must exist in settlement
};

export type UpdateExpenseCommand = CreateExpenseCommand; // same shape as POST

// Settlement Snapshots
export type GetSettlementSnapshotQuery = Record<string, never>; // no query params

// Events
export interface CreateEventCommand {
  event_type: EventType;
  settlement_id: UUID | null;
  payload: EventPayload;
}

export interface GetEventsQuery {
  settlement_id?: UUID;
  event_type?: EventType;
  date_from?: DateString;
  date_to?: DateString;
  page?: number;
  limit?: number; // max 100
}

// -----------------------------
// Response wrappers per endpoint families (for convenience)
// -----------------------------

export type SettlementsListResponse = PagedResponse<SettlementSummaryDTO>;
export type ParticipantsListResponse = PagedResponse<ParticipantDTO>;
export type ExpensesListResponse = PagedResponse<ExpenseDTO>;
export type EventsListResponse = PagedResponse<EventDTO>;

</type_definitions>

3. Tech stack:
<tech_stack>
Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- Vue 3 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami z rodziny OpenAi:

- Dostęp do szerokiej gamy modeli , które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- CludeFlare dla hostowania JS stacku aplikacji

</tech_stack>

4. Implementation rules:
<implementation_rules>
# AI Rules for {app-name}

{project-description}

## Tech Stack

- Astro 5
- TypeScript 5
- React 19
- Tailwind 4
- Shadcn/ui

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/layouts` - Astro layouts
- `./src/pages` - Astro pages
- `./src/pages/api` - API endpoints
- `./src/middleware/index.ts` - Astro middleware
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - Client-side components written in Astro (static) and React (dynamic)
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Services and helpers 
- `./src/assets` - static internal assets
- `./public` - public assets

When modifying the directory structure, always update this section.

## Coding practices

### Guidelines for clean code

- Use feedback from linters to improve the code when making changes.
- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.
- Before running a node-related command in the terminal, run `nvm use` and use bun to execute the command.


### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Use supabase from context.locals in Astro routes instead of importing supabaseClient directly
- Use SupabaseClient type from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`

### Guidelines for Astro

- Leverage View Transitions API for smooth page transitions (use ClientRouter)
- Use content collections with type safety for blog posts, documentation, etc.
- Leverage Server Endpoints for API routes
- Use POST, GET  - uppercase format for endpoint handlers
- Use `export const prerender = false` for API routes
- Use zod for input validation in API routes
- Extract logic into services in `src/lib/services`
- Implement middleware for request/response modification
- Use image optimization with the Astro Image integration
- Implement hybrid rendering with server-side rendering where needed
- Use Astro.cookies for server-side cookie management
- Leverage import.meta.env for environment variables

</implementation_rules>

Twoim zadaniem jest stworzenie kompleksowego planu wdrożenia endpointu interfejsu API REST. Przed dostarczeniem ostatecznego planu użyj znaczników <analysis>, aby przeanalizować informacje i nakreślić swoje podejście. W tej analizie upewnij się, że:

1. Podsumuj kluczowe punkty specyfikacji API.
2. Wymień wymagane i opcjonalne parametry ze specyfikacji API.
3. Wymień niezbędne typy DTO i Command Modele.
4. Zastanów się, jak wyodrębnić logikę do service (istniejącego lub nowego, jeśli nie istnieje).
5. Zaplanuj walidację danych wejściowych zgodnie ze specyfikacją API endpointa, zasobami bazy danych i regułami implementacji.
6. Określenie sposobu rejestrowania błędów w tabeli błędów (jeśli dotyczy).
7. Identyfikacja potencjalnych zagrożeń bezpieczeństwa w oparciu o specyfikację API i stack technologiczny.
8. Nakreśl potencjalne scenariusze błędów i odpowiadające im kody stanu.

Po przeprowadzeniu analizy utwórz szczegółowy plan wdrożenia w formacie markdown. Plan powinien zawierać następujące sekcje:

1. Przegląd punktu końcowego
2. Szczegóły żądania
3. Szczegóły odpowiedzi
4. Przepływ danych
5. Względy bezpieczeństwa
6. Obsługa błędów
7. Wydajność
8. Kroki implementacji

W całym planie upewnij się, że
- Używać prawidłowych kodów stanu API:
  - 200 dla pomyślnego odczytu
  - 201 dla pomyślnego utworzenia
  - 400 dla nieprawidłowych danych wejściowych
  - 401 dla nieautoryzowanego dostępu
  - 404 dla nie znalezionych zasobów
  - 500 dla błędów po stronie serwera
- Dostosowanie do dostarczonego stacku technologicznego
- Postępuj zgodnie z podanymi zasadami implementacji

Końcowym wynikiem powinien być dobrze zorganizowany plan wdrożenia w formacie markdown i nie powinny powielać ani powtarzać żadnej pracy wykonanej w sekcji analizy.

Pamiętaj, aby zapisać swój plan wdrożenia jako .ai/view-implementation-plan.md. Upewnij się, że plan jest szczegółowy, przejrzysty i zapewnia kompleksowe wskazówki dla zespołu programistów.
