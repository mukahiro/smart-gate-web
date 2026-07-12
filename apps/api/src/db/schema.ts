import { index, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const attendanceEvents = sqliteTable(
  "attendance_events",
  {
    eventId: text("event_id").primaryKey(),
    personId: text("person_id").notNull(),
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
    personAuthenticatedAtIndex: index(
      "attendance_events_person_authenticated_at_index",
    ).on(table.personId, table.authenticatedAt),
  }),
);
