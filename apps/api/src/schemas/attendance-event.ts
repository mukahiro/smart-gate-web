import { z } from "zod";

export const attendanceMethodSchema = z.enum(["face", "card"]);
export const attendanceEventTypeSchema = z.enum(["check_in", "check_out"]);

export const attendanceEventInputSchema = z
  .object({
    eventId: z.string().min(1),
    studentNumber: z.string().regex(/^[0-9]{10}$/),
    deviceId: z.string().min(1),
    method: attendanceMethodSchema,
    eventType: attendanceEventTypeSchema,
    authenticatedAt: z.string().datetime({ offset: true }),
    confidence: z.number().min(0).max(1).optional(),
  })
  .superRefine((event, ctx) => {
    if (event.method === "face" && event.confidence === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confidence"],
        message: "顔認証イベントには信頼度が必要です",
      });
    }
  });

export type AttendanceMethod = z.infer<typeof attendanceMethodSchema>;
export type AttendanceEventType = z.infer<typeof attendanceEventTypeSchema>;
export type AttendanceEventInput = z.infer<typeof attendanceEventInputSchema>;
