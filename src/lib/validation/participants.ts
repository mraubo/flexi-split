import { z } from "zod";

export const CreateParticipantCommandSchema = z
  .object({
    nickname: z
      .string()
      .min(2, "nickname must be at least 2 characters")
      .max(30, "nickname must be at most 30 characters")
      .regex(/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ._+\-!#$%&'*/=?^`{|}~@]+$/, "nickname contains invalid characters")
      .transform((val) => val.trim())
      .refine((val) => val.length >= 2, {
        message: "nickname must be at least 2 characters after trimming spaces",
      }),
  })
  .strict();

export type CreateParticipantCommandInput = z.input<typeof CreateParticipantCommandSchema>;
export type CreateParticipantCommandOutput = z.output<typeof CreateParticipantCommandSchema>;

export const UpdateParticipantCommandSchema = z
  .object({
    nickname: z
      .string()
      .min(2, "nickname must be at least 2 characters")
      .max(30, "nickname must be at most 30 characters")
      .regex(/^[a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ._+\-!#$%&'*/=?^`{|}~@]+$/, "nickname contains invalid characters")
      .transform((val) => val.trim())
      .refine((val) => val.length >= 2, {
        message: "nickname must be at least 2 characters after trimming spaces",
      }),
  })
  .strict();

export type UpdateParticipantCommandInput = z.input<typeof UpdateParticipantCommandSchema>;
export type UpdateParticipantCommandOutput = z.output<typeof UpdateParticipantCommandSchema>;
