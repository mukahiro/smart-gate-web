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

describe("phase 5 migration", () => {
  it("migrates existing users to member and creates audit logs", () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-phase5-migration-test-")),
      "test.sqlite3",
    );
    const sqlite = new Database(databasePath);
    sqlite.exec(readMigration("0000_complete_meggan.sql"));
    sqlite.exec(readMigration("0001_famous_stryfe.sql"));
    sqlite
      .prepare(
        `INSERT INTO users (
          id, student_number, name, lcd_display_name, email,
          email_normalized, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "legacy-user",
        "1234567890",
        "既存利用者",
        "LEGACY",
        "legacy@example.com",
        "legacy@example.com",
        1,
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
        "legacy-user",
        "legacy-password-hash",
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
        "legacy-token-hash",
        "legacy-user",
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
        "legacy-event",
        "1234567890",
        "legacy-user",
        "device-001",
        "card",
        "check_in",
        "2026-01-01T01:00:00.000Z",
        "2026-01-01T01:00:01.000Z",
      );

    sqlite.exec(readMigration("0002_dark_greymalkin.sql"));

    expect(
      sqlite
        .prepare("SELECT id, role FROM users WHERE id = ?")
        .get("legacy-user"),
    ).toEqual({ id: "legacy-user", role: "member" });
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_audit_logs'",
        )
        .get(),
    ).toEqual({ name: "admin_audit_logs" });
    expect(
      sqlite
        .prepare("SELECT user_id FROM user_credentials WHERE user_id = ?")
        .get("legacy-user"),
    ).toEqual({ user_id: "legacy-user" });
    expect(
      sqlite
        .prepare("SELECT user_id FROM sessions WHERE token_hash = ?")
        .get("legacy-token-hash"),
    ).toEqual({ user_id: "legacy-user" });
    expect(
      sqlite
        .prepare("SELECT user_id FROM attendance_events WHERE event_id = ?")
        .get("legacy-event"),
    ).toEqual({ user_id: "legacy-user" });
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
