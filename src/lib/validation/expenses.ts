import { z } from "zod";

// UUID validation for path parameters
export const UUIDSchema = z.string().uuid();

export const GetExpensesQuerySchema = z.object({
  participant_id: z.string().uuid().optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort_by: z.enum(["expense_date", "created_at", "amount_cents"]).default("expense_date"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

// Schema for GET and DELETE expense endpoint parameters
export const GetExpenseParamsSchema = z.object({
  settlement_id: z.string().uuid(),
  id: z.string().uuid(),
});

export const DeleteExpenseParamsSchema = GetExpenseParamsSchema;

export type GetExpenseParamsInput = z.input<typeof GetExpenseParamsSchema>;
export type GetExpenseParamsOutput = z.output<typeof GetExpenseParamsSchema>;

export type DeleteExpenseParamsInput = z.input<typeof DeleteExpenseParamsSchema>;
export type DeleteExpenseParamsOutput = z.output<typeof DeleteExpenseParamsSchema>;

// Schema for PUT expense endpoint parameters (same as GET/DELETE)
export const UpdateExpenseParamsSchema = GetExpenseParamsSchema;

export type UpdateExpenseParamsInput = z.input<typeof UpdateExpenseParamsSchema>;
export type UpdateExpenseParamsOutput = z.output<typeof UpdateExpenseParamsSchema>;

// Schema for POST expense endpoint body
export const CreateExpenseCommandSchema = z.object({
  payer_participant_id: z.string().uuid(),
  amount_cents: z.coerce.number().int().gt(0),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(140).nullable().optional(),
  participant_ids: z.array(z.string().uuid()).min(1),
});

export type CreateExpenseCommandInput = z.input<typeof CreateExpenseCommandSchema>;
export type CreateExpenseCommandOutput = z.output<typeof CreateExpenseCommandSchema>;

// UpdateExpenseCommand has the same structure as CreateExpenseCommand
export const UpdateExpenseCommandSchema = CreateExpenseCommandSchema;

export type UpdateExpenseCommandInput = z.input<typeof UpdateExpenseCommandSchema>;
export type UpdateExpenseCommandOutput = z.output<typeof UpdateExpenseCommandSchema>;

export type GetExpensesQueryInput = z.input<typeof GetExpensesQuerySchema>;
export type GetExpensesQueryOutput = z.output<typeof GetExpensesQuerySchema>;
