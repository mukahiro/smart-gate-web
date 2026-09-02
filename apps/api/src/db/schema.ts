import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    studentNumber: text("student_number").notNull().unique(),
    name: text("name").notNull(),
    lcdDisplayName: text("lcd_display_name").notNull(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull().unique(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    studentNumberFormatCheck: check(
      "users_student_number_format_check",
      sql`length(${table.studentNumber}) = 10 AND ${table.studentNumber} NOT GLOB '*[^0-9]*'`,
    ),
    lcdDisplayNameLengthCheck: check(
      "users_lcd_display_name_length_check",
      sql`length(${table.lcdDisplayName}) BETWEEN 1 AND 20`,
    ),
  }),
);

export const userCredentials = sqliteTable(
  "user_credentials",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: text("locked_until"),
    passwordChangedAt: text("password_changed_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    failedLoginCountCheck: check(
      "user_credentials_failed_login_count_check",
      sql`${table.failedLoginCount} >= 0`,
    ),
  }),
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    idleExpiresAt: text("idle_expires_at").notNull(),
    absoluteExpiresAt: text("absolute_expires_at").notNull(),
  },
  (table) => ({
    userIndex: index("sessions_user_id_index").on(table.userId),
    idleExpiresAtIndex: index("sessions_idle_expires_at_index").on(
      table.idleExpiresAt,
    ),
  }),
);

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
