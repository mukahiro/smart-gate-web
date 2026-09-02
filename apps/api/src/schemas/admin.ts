import { z } from "zod";

const nameSchema = z.string().trim().min(1).max(100);
const lcdDisplayNameSchema = z.string().trim().min(1).max(20);
const emailSchema = z.string().trim().email().max(254);

export const createAdminUserSchema = z
  .object({
    studentNumber: z.string().regex(/^[0-9]{10}$/),
    name: nameSchema,
    lcdDisplayName: lcdDisplayNameSchema,
    email: emailSchema,
  })
  .strict();

export const updateAdminUserSchema = z
  .object({
    name: nameSchema.optional(),
    lcdDisplayName: lcdDisplayNameSchema.optional(),
    email: emailSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const auditLogQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).optional(),
  })
  .strict();
