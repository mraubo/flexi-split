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
