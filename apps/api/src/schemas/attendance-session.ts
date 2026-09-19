import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });

export const createAttendanceSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    startsAt: timestampSchema,
    endsAt: timestampSchema,
  })
  .strict()
  .refine((value) => Date.parse(value.startsAt) < Date.parse(value.endsAt), {
    path: ["endsAt"],
    message: "終了日時は開始日時より後にしてください",
  });

export const updateAttendanceSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    startsAt: timestampSchema.optional(),
    endsAt: timestampSchema.optional(),
    expectedUpdatedAt: timestampSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.startsAt !== undefined ||
      value.endsAt !== undefined,
    { message: "更新する項目を指定してください" },
  )
  .refine(
    (value) =>
      value.startsAt === undefined ||
      value.endsAt === undefined ||
      Date.parse(value.startsAt) < Date.parse(value.endsAt),
    {
      path: ["endsAt"],
      message: "終了日時は開始日時より後にしてください",
    },
  );

export const cancelAttendanceSessionSchema = z
  .object({ expectedUpdatedAt: timestampSchema })
  .strict();

export type CreateAttendanceSessionInput = z.infer<
  typeof createAttendanceSessionSchema
>;
export type UpdateAttendanceSessionInput = z.infer<
  typeof updateAttendanceSessionSchema
>;
