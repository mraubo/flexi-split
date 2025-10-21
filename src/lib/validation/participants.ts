import { z } from "zod";

export const CreateParticipantCommandSchema = z
  .object({
    nickname: z
      .string()
      .min(3, "nickname must be at least 3 characters")
      .max(30, "nickname must be at most 30 characters")
      .regex(/^[a-z0-9_-]+$/, "nickname can only contain lowercase letters, numbers, underscores and hyphens"),
  })
  .strict();

export type CreateParticipantCommandInput = z.input<typeof CreateParticipantCommandSchema>;
export type CreateParticipantCommandOutput = z.output<typeof CreateParticipantCommandSchema>;

export const UpdateParticipantCommandSchema = z
  .object({
    nickname: z
      .string()
      .min(3, "nickname must be at least 3 characters")
      .max(30, "nickname must be at most 30 characters")
      .regex(/^[a-z0-9_-]+$/, "nickname can only contain lowercase letters, numbers, underscores and hyphens"),
  })
  .strict();

export type UpdateParticipantCommandInput = z.input<typeof UpdateParticipantCommandSchema>;
export type UpdateParticipantCommandOutput = z.output<typeof UpdateParticipantCommandSchema>;
