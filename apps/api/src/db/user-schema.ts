import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userRoles = ["member", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    studentNumber: text("student_number").notNull().unique(),
    name: text("name").notNull(),
    lcdDisplayName: text("lcd_display_name").notNull(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull().unique(),
    role: text("role", { enum: userRoles }).notNull().default("member"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    faceImageCount: integer("face_image_count").notNull().default(0),
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
    roleCheck: check(
      "users_role_check",
      sql`${table.role} IN ('member', 'admin')`,
    ),
    faceImageCountCheck: check(
      "users_face_image_count_check",
      sql`${table.faceImageCount} BETWEEN 0 AND 10`,
    ),
  }),
);
