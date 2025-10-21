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
