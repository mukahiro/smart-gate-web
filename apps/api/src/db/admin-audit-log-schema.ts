import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user-schema";

export const adminAuditActions = [
  "user_created",
  "user_updated",
  "user_enabled",
  "user_disabled",
  "user_unlocked",
  "user_sessions_revoked",
  "user_password_reset",
  "user_face_images_updated",
] as const;

export type AdminAuditAction = (typeof adminAuditActions)[number];

export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id),
    action: text("action", { enum: adminAuditActions }).notNull(),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id),
    occurredAt: text("occurred_at").notNull(),
    changedFields: text("changed_fields").notNull(),
  },
  (table) => ({
    occurredAtIdIndex: index("admin_audit_logs_occurred_at_id_index").on(
      table.occurredAt,
      table.id,
    ),
  }),
);
