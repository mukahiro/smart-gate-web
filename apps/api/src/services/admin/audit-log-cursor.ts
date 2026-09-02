import { z } from "zod";

const cursorValueSchema = z
  .object({
    occurredAt: z.string().datetime({ offset: true }),
    id: z.string().min(1),
  })
  .strict();

export type AuditLogCursor = z.infer<typeof cursorValueSchema>;

export const encodeAuditLogCursor = (cursor: AuditLogCursor) =>
  Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");

export const decodeAuditLogCursor = (cursor: string): AuditLogCursor => {
  const value: unknown = JSON.parse(
    Buffer.from(cursor, "base64url").toString("utf8"),
  );
  return cursorValueSchema.parse(value);
};
