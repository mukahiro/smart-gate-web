import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user-schema";

export const attendanceEvents = sqliteTable(
  "attendance_events",
  {
    eventId: text("event_id").primaryKey(),
    studentNumberSnapshot: text("student_number_snapshot").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    deviceId: text("device_id").notNull(),
    method: text("method", { enum: ["face", "card"] }).notNull(),
    eventType: text("event_type", {
      enum: ["check_in", "check_out"],
    }).notNull(),
    authenticatedAt: text("authenticated_at").notNull(),
    receivedAt: text("received_at").notNull(),
    confidence: real("confidence"),
  },
  (table) => ({
    studentNumberAuthenticatedAtIndex: index(
      "attendance_events_student_number_authenticated_at_index",
    ).on(table.studentNumberSnapshot, table.authenticatedAt),
    userAuthenticatedAtIndex: index(
      "attendance_events_user_authenticated_at_index",
    ).on(table.userId, table.authenticatedAt),
  }),
);
