import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./user-schema";

export const attendanceSessions = sqliteTable(
  "attendance_sessions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id),
    cancelledAt: text("cancelled_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    startsAtIndex: index("attendance_sessions_starts_at_index").on(
      table.startsAt,
    ),
    titleLengthCheck: check(
      "attendance_sessions_title_length_check",
      sql`length(${table.title}) BETWEEN 1 AND 100`,
    ),
    periodCheck: check(
      "attendance_sessions_period_check",
      sql`${table.startsAt} < ${table.endsAt}`,
    ),
  }),
);
