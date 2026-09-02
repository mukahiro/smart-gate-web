import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { users } from "./user-schema";

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
