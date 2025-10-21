import { z } from "zod";

export const GetSettlementsQuerySchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort_by: z.enum(["created_at", "updated_at", "title"]).default("created_at").optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type GetSettlementsQueryInput = z.input<typeof GetSettlementsQuerySchema>;
export type GetSettlementsQueryOutput = z.output<typeof GetSettlementsQuerySchema>;

export const CreateSettlementSchema = z.object({
  title: z.string().min(1, "title is required").max(100, "max 100 chars"),
});

export type CreateSettlementInput = z.infer<typeof CreateSettlementSchema>;

export const UpdateSettlementSchema = z.object({
  title: z.string().min(1, "title is required").max(100, "max 100 chars"),
});

export type UpdateSettlementInput = z.infer<typeof UpdateSettlementSchema>;

// UUID validation for path parameters
export const UUIDSchema = z.uuid();

export type UUIDInput = z.input<typeof UUIDSchema>;
export type UUIDOutput = z.output<typeof UUIDSchema>;

// Close Settlement endpoint schemas
export const CloseSettlementParamsSchema = z.object({
  id: UUIDSchema,
});

export type CloseSettlementParamsInput = z.input<typeof CloseSettlementParamsSchema>;
export type CloseSettlementParamsOutput = z.output<typeof CloseSettlementParamsSchema>;

export const CloseSettlementBodySchema = z.object({}); // Empty body

export type CloseSettlementBodyInput = z.input<typeof CloseSettlementBodySchema>;
export type CloseSettlementBodyOutput = z.output<typeof CloseSettlementBodySchema>;

// Idempotency-Key validation (optional header)
export const IdempotencyKeySchema = z.string().min(1).max(255).optional();

export type IdempotencyKeyInput = z.input<typeof IdempotencyKeySchema>;
export type IdempotencyKeyOutput = z.output<typeof IdempotencyKeySchema>;

export const TransferSchema = z.object({
  from: UUIDSchema,
  to: UUIDSchema,
  amount_cents: z.number().int().min(1), // Must be positive
});

export const CloseSettlementResponseSchema = z.object({
  id: UUIDSchema,
  status: z.literal("closed"),
  closed_at: z.string(), // ISO timestamp
  balances: z.record(UUIDSchema, z.number().int()), // participant_id -> amount_cents
  transfers: z.array(TransferSchema),
});

export type CloseSettlementResponseInput = z.input<typeof CloseSettlementResponseSchema>;
export type CloseSettlementResponseOutput = z.output<typeof CloseSettlementResponseSchema>;

// Participants endpoint schemas
export const GetParticipantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetParticipantsQueryInput = z.input<typeof GetParticipantsQuerySchema>;
export type GetParticipantsQueryOutput = z.output<typeof GetParticipantsQuerySchema>;

// Participant ID validation for path parameters
export const ParticipantIdSchema = z.uuid("invalid participant ID format");

export type ParticipantIdInput = z.input<typeof ParticipantIdSchema>;
export type ParticipantIdOutput = z.output<typeof ParticipantIdSchema>;

// Combined path parameters schema for participant endpoints
export const ParticipantPathParamsSchema = z.object({
  settlement_id: z.uuid("invalid settlement ID format"),
  id: z.uuid("invalid participant ID format"),
});

export type ParticipantPathParamsInput = z.input<typeof ParticipantPathParamsSchema>;
export type ParticipantPathParamsOutput = z.output<typeof ParticipantPathParamsSchema>;
