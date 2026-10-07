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

describe("audit log migration", () => {
  it("generalizes existing admin audit logs without losing their contents", () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-audit-log-migration-")),
      "test.sqlite3",
    );
    const sqlite = new Database(databasePath);
    sqlite.pragma("foreign_keys = ON");
    for (const migration of [
      "0000_complete_meggan.sql",
      "0001_famous_stryfe.sql",
      "0002_dark_greymalkin.sql",
      "0003_sudden_tempest.sql",
      "0004_free_bulldozer.sql",
      "0005_slimy_may_parker.sql",
    ]) {
      sqlite.exec(readMigration(migration));
    }

    const insertUser = sqlite.prepare(
      `INSERT INTO users (
        id, student_number, name, lcd_display_name, email, email_normalized,
        user_type, is_admin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    insertUser.run(
      "admin-001",
      "0000000001",
      "管理者",
      "ADMIN",
      "admin@example.com",
      "admin@example.com",
      "student",
      1,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    );
    insertUser.run(
      "student-001",
      "0000000002",
      "生徒",
      "STUDENT",
      "student@example.com",
      "student@example.com",
      "student",
      0,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
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
        "admin-001",
        "user_updated",
        "student-001",
        "2026-01-02T03:04:05.000Z",
        '["name"]',
      );

    sqlite.exec(readMigration("0006_melodic_wonder_man.sql"));

    expect(
      sqlite
        .prepare(
          `SELECT id, actor_user_id, action, resource_type, resource_id,
                  occurred_at, changed_fields, changes
             FROM audit_logs`,
        )
        .get(),
    ).toEqual({
      id: "audit-001",
      actor_user_id: "admin-001",
      action: "user_updated",
      resource_type: "user",
      resource_id: "student-001",
      occurred_at: "2026-01-02T03:04:05.000Z",
      changed_fields: '["name"]',
      changes: null,
    });
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_audit_logs'",
        )
        .get(),
    ).toBeUndefined();
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
