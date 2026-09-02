import { z } from "zod";

const monthSchema = z.string().regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/);

const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(0);
    parsed.setUTCHours(0, 0, 0, 0);
    parsed.setUTCFullYear(year ?? 0, (month ?? 1) - 1, day ?? 1);
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === (month ?? 1) - 1 &&
      parsed.getUTCDate() === day
    );
  });

export const monthlyHistoryQuerySchema = z
  .object({ month: monthSchema })
  .strict();

export const dailyHistoryQuerySchema = z.object({ date: dateSchema }).strict();
