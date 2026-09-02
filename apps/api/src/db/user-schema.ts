import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
