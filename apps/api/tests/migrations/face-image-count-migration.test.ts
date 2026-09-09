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

describe("face image count migration", () => {
  it("adds a zero face image count to existing users", () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-face-count-migration-test-")),
      "test.sqlite3",
    );
    const sqlite = new Database(databasePath);
    sqlite.pragma("foreign_keys = ON");
    for (const migration of [
      "0000_complete_meggan.sql",
      "0001_famous_stryfe.sql",
      "0002_dark_greymalkin.sql",
    ]) {
      sqlite.exec(readMigration(migration));
    }
    sqlite
      .prepare(
        `INSERT INTO users (
          id, student_number, name, lcd_display_name, email,
          email_normalized, role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "existing-user",
        "1234567890",
        "既存利用者",
        "EXISTING",
        "existing@example.com",
        "existing@example.com",
        "member",
        1,
        "2026-01-01T00:00:00.000Z",
        "2026-01-01T00:00:00.000Z",
      );

    sqlite.exec(readMigration("0003_sudden_tempest.sql"));

    expect(
      sqlite
        .prepare("SELECT face_image_count FROM users WHERE id = ?")
        .get("existing-user"),
    ).toEqual({ face_image_count: 0 });
  });
});
