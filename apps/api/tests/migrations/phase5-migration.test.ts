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
  });
});
