import type { Tables } from "@/db/database.types";

// Shared foundational scalar aliases. These align with DB column types but
// provide semantic meaning across DTOs and command models.
export type UUID = string;
export type TimestampString = string;
export type DateString = string;
export type AmountCents = number;

export type SortOrder = "asc" | "desc";

export type SettlementStep = "participants" | "expenses" | "summary";

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

// Shared fields used by multiple Settlement DTOs
type SettlementBaseFields = Pick<
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
  | "deleted_at"
  | "owner_id"
>;

// Raw Supabase response with expenses for internal processing
export type SettlementWithExpenses = SettlementBaseFields & {
  expenses: { amount_cents: number }[] | null;
};

// Summary DTO returned by list/detail endpoints
export type SettlementSummaryDTO = SettlementBaseFields & {
  total_expenses_amount_cents: number;
};

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
  ownerNickname?: string; // optional: nickname for the owner participant, defaults to "Owner"
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

export type ExpenseSortBy = "expense_date" | "created_at" | "amount_cents";

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

// -----------------------------
// Frontend-specific types for Settlements view
// -----------------------------

export type SettlementsTab = "active" | "archive";

export interface SettlementsQueryState {
  status: "open" | "closed";
  page: number;
  limit: number;
  sort_by: "updated_at";
  sort_order: "desc";
}

export interface SettlementCardVM {
  id: string;
  title: string;
  status: string;
  participantsCount: number;
  expensesCount: number;
  totalExpensesAmountCents: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date | null;
  isDeletable: boolean; // status === "closed"
  href: string; // /settlements/{id}
}

export interface AggregatedCountsVM {
  activeCount: number;
  archiveCount: number;
}

export interface ApiError {
  status: number;
  code?: string;
  message?: string;
  details?: unknown;
}

// -----------------------------
// Auth DTOs
// -----------------------------

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  password: string;
}

export interface CreateExpenseRpcResult {
  id: string;
  settlement_id: string;
  payer_participant_id: string;
  amount_cents: number;
  expense_date: string;
  description: string | null;
  share_count: number;
  created_at: string;
  updated_at: string;
  last_edited_by: string | null;
}

export type UpdateExpenseRpcResult = CreateExpenseRpcResult;

export interface ExpenseParticipantQueryResult {
  participants: {
    id: string;
    nickname: string;
  };
}

// Utility functions

export function mapSettlementToVM(dto: SettlementSummaryDTO): SettlementCardVM {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    participantsCount: dto.participants_count,
    expensesCount: dto.expenses_count,
    totalExpensesAmountCents: dto.total_expenses_amount_cents,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    closedAt: dto.closed_at ? new Date(dto.closed_at) : null,
    isDeletable: dto.status === "closed",
    href: `/settlements/${dto.id}`,
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amountCents: number, currency = "PLN"): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
}

// -----------------------------
// Frontend-specific types for Participants view
// -----------------------------

export interface ParticipantsListVM {
  items: ParticipantItemVM[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface ParticipantItemVM {
  id: string;
  nickname: string;
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// -----------------------------
// Frontend-specific types for Expenses view
// -----------------------------

export interface ExpenseCardVM {
  id: UUID;
  payerNickname: string;
  amountCents: number;
  expenseDate: Date;
  description?: string | null;
  shareCount: number;
  participantsShort: string[];
  canEdit: boolean;
  canDelete: boolean;
}

export interface ExpenseGroupVM {
  date: Date;
  items: ExpenseCardVM[];
}

export interface ExpensesQueryState {
  participantId?: UUID;
  page: number;
  limit: number;
  sort_by: ExpenseSortBy;
  sort_order: SortOrder;
}
