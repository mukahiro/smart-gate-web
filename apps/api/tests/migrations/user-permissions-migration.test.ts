import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../drizzle/${name}`, import.meta.url)),
    "utf8",
  ).replaceAll("--> statement-breakpoint", "");

describe("user permissions migration", () => {
  it("separates user type and admin permission without losing relations", () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-user-permissions-migration-")),
      "test.sqlite3",
    );
    const sqlite = new Database(databasePath);
    for (const migration of [
      "0000_complete_meggan.sql",
      "0001_famous_stryfe.sql",
      "0002_dark_greymalkin.sql",
      "0003_sudden_tempest.sql",
    ]) {
      sqlite.exec(readMigration(migration));
    }

    const insertUser = sqlite.prepare(
      `INSERT INTO users (
        id, student_number, name, lcd_display_name, email, email_normalized,
        role, is_active, face_image_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertUser.run(
      "legacy-member",
      "1234567890",
      "既存一般利用者",
      "MEMBER",
      "member@example.com",
      "member@example.com",
      "member",
      1,
      0,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    insertUser.run(
      "legacy-admin",
      "0987654321",
      "既存管理者",
      "ADMIN",
      "admin@example.com",
      "admin@example.com",
      "admin",
      1,
      0,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    sqlite
      .prepare(
        `INSERT INTO user_credentials (
          user_id, password_hash, password_changed_at, updated_at
        ) VALUES (?, ?, ?, ?)`,
      )
      .run(
        "legacy-member",
        "hash",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      );
    sqlite
      .prepare(
        `INSERT INTO sessions (
          token_hash, user_id, created_at, last_seen_at,
          idle_expires_at, absolute_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "token-hash",
        "legacy-member",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T02:00:00.000Z",
        "2026-01-01T12:00:00.000Z",
      );
    sqlite
      .prepare(
        `INSERT INTO attendance_events (
          event_id, student_number_snapshot, user_id, device_id,
          method, event_type, authenticated_at, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "event-001",
        "1234567890",
        "legacy-member",
        "device-001",
        "card",
        "check_in",
        "2026-01-01T01:00:00.000Z",
        "2026-01-01T01:00:01.000Z",
      );
    sqlite
      .prepare(
        `INSERT INTO admin_audit_logs (
          id, actor_user_id, action, target_user_id,
          occurred_at, changed_fields
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "audit-001",
        "legacy-admin",
        "user_updated",
        "legacy-member",
        "2026-01-01T02:00:00.000Z",
        '["name"]',
      );

    sqlite.exec(readMigration("0004_free_bulldozer.sql"));

    expect(
      sqlite
        .prepare("SELECT id, user_type, is_admin FROM users ORDER BY id ASC")
        .all(),
    ).toEqual([
      { id: "legacy-admin", user_type: "student", is_admin: 1 },
      { id: "legacy-member", user_type: "student", is_admin: 0 },
    ]);
    expect(
      sqlite
        .prepare("SELECT user_id FROM user_credentials WHERE user_id = ?")
        .get("legacy-member"),
    ).toEqual({ user_id: "legacy-member" });
    expect(
      sqlite
        .prepare("SELECT user_id FROM sessions WHERE token_hash = ?")
        .get("token-hash"),
    ).toEqual({ user_id: "legacy-member" });
    expect(
      sqlite
        .prepare("SELECT user_id FROM attendance_events WHERE event_id = ?")
        .get("event-001"),
    ).toEqual({ user_id: "legacy-member" });
    expect(
      sqlite
        .prepare(
          "SELECT actor_user_id, target_user_id FROM admin_audit_logs WHERE id = ?",
        )
        .get("audit-001"),
    ).toEqual({
      actor_user_id: "legacy-admin",
      target_user_id: "legacy-member",
    });
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);

    sqlite
      .prepare(
        `INSERT INTO users (
          id, student_number, name, lcd_display_name, email,
          email_normalized, user_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "teacher-without-student-number",
        null,
        "先生",
        "TEACHER",
        "teacher@example.com",
        "teacher@example.com",
        "teacher",
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      );
    expect(
      sqlite
        .prepare("SELECT student_number FROM users WHERE id = ?")
        .get("teacher-without-student-number"),
    ).toEqual({ student_number: null });

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO users (
            id, student_number, name, lcd_display_name, email,
            email_normalized, user_type, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "invalid-student",
          null,
          "学籍番号なし生徒",
          "INVALID",
          "invalid@example.com",
          "invalid@example.com",
          "student",
          "2026-01-01T00:00:00.000Z",
          "2026-01-01T00:00:00.000Z",
        ),
    ).toThrow();
  });
});
