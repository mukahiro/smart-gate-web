import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../drizzle/0001_famous_stryfe.sql", import.meta.url),
);

describe("phase 2 migration", () => {
  it("preserves existing attendance events when renaming person_id", () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-migration-test-")),
      "test.sqlite3",
    );
    const sqlite = new Database(databasePath);
    sqlite.exec(`
      CREATE TABLE attendance_events (
        event_id text PRIMARY KEY NOT NULL,
        person_id text NOT NULL,
        device_id text NOT NULL,
        method text NOT NULL,
        event_type text NOT NULL,
        authenticated_at text NOT NULL,
        received_at text NOT NULL,
        confidence real
      );
      CREATE INDEX attendance_events_person_authenticated_at_index
        ON attendance_events (person_id, authenticated_at);
      INSERT INTO attendance_events VALUES (
        'legacy-event',
        'legacy-person-id',
        'device-001',
        'card',
        'check_in',
        '2026-07-12T08:45:12+09:00',
        '2026-07-12T08:45:13.000Z',
        NULL
      );
    `);
    const migration = readFileSync(migrationPath, "utf8").replaceAll(
      "--> statement-breakpoint",
      "",
    );

    sqlite.exec(migration);

    expect(
      sqlite
        .prepare(
          "SELECT event_id, student_number_snapshot, user_id FROM attendance_events",
        )
        .get(),
    ).toEqual({
      event_id: "legacy-event",
      student_number_snapshot: "legacy-person-id",
      user_id: null,
    });
    expect(
      sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        )
        .all(),
    ).toEqual(
      expect.arrayContaining([
        { name: "sessions" },
        { name: "user_credentials" },
        { name: "users" },
      ]),
    );
  });
});
