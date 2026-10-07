import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user-schema";

export const auditActions = [
  "user_created",
  "user_updated",
  "user_enabled",
  "user_disabled",
  "user_unlocked",
  "user_sessions_revoked",
  "user_password_reset",
  "user_face_images_updated",
  "attendance_session_created",
  "attendance_session_updated",
  "attendance_session_cancelled",
] as const;

export type AuditAction = (typeof auditActions)[number];

export const auditResourceTypes = ["user", "attendance_session"] as const;
export type AuditResourceType = (typeof auditResourceTypes)[number];

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id),
    action: text("action", { enum: auditActions }).notNull(),
    resourceType: text("resource_type", {
      enum: auditResourceTypes,
    }).notNull(),
    resourceId: text("resource_id").notNull(),
    occurredAt: text("occurred_at").notNull(),
    changedFields: text("changed_fields").notNull(),
    changes: text("changes"),
  },
  (table) => ({
    occurredAtIdIndex: index("audit_logs_occurred_at_id_index").on(
      table.occurredAt,
      table.id,
    ),
    resourceOccurredAtIdIndex: index(
      "audit_logs_resource_occurred_at_id_index",
    ).on(table.resourceType, table.resourceId, table.occurredAt, table.id),
  }),
);
