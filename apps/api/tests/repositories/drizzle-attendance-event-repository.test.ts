import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createSqliteDatabase } from "../../src/db/client";
import { users } from "../../src/db/user-schema";
import { createDrizzleAttendanceEventRepository } from "../../src/repositories/drizzle-attendance-event-repository";
import type { AttendanceEventInput } from "../../src/schemas/attendance-event";

const createDatabasePath = () =>
  join(mkdtempSync(join(tmpdir(), "smart-gate-api-test-")), "test.sqlite3");
const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

const attendanceEvent: AttendanceEventInput = {
  eventId: "event-001",
  studentNumber: "1234567890",
  deviceId: "device-001",
  method: "card",
  eventType: "check_in",
  authenticatedAt: "2026-07-12T08:45:12+09:00",
};

const createAttendanceEventRepository = (databasePath: string) =>
  createDrizzleAttendanceEventRepository(
    createSqliteDatabase(databasePath, { migrationsFolder }),
  );

describe("createDrizzleAttendanceEventRepository", () => {
  it("saves attendance events to SQLite", () => {
    const repository = createAttendanceEventRepository(createDatabasePath());

    const result = repository.save(attendanceEvent, "2026-07-12T08:45:13.000Z");

    expect(result).toMatchObject({
      kind: "created",
      event: {
        ...attendanceEvent,
        userId: null,
        lcdDisplayName: null,
        receivedAt: "2026-07-12T08:45:13.000Z",
      },
    });
  });

  it("returns duplicate for an event id already stored in SQLite", () => {
    const databasePath = createDatabasePath();
    const firstRepository = createAttendanceEventRepository(databasePath);
    const secondRepository = createAttendanceEventRepository(databasePath);

    const firstResult = firstRepository.save(
      attendanceEvent,
      "2026-07-12T08:45:13.000Z",
    );
    const secondResult = secondRepository.save(
      {
        ...attendanceEvent,
        studentNumber: "0987654321",
      },
      "2026-07-12T08:45:14.000Z",
    );

    expect(firstResult.kind).toBe("created");
    expect(secondResult).toMatchObject({
      kind: "duplicate",
      event: {
        ...attendanceEvent,
        userId: null,
        lcdDisplayName: null,
        receivedAt: "2026-07-12T08:45:13.000Z",
      },
    });
  });

  it("links a registered user when saving an attendance event", () => {
    const databasePath = createDatabasePath();
    const db = createSqliteDatabase(databasePath, { migrationsFolder });
    db.insert(users)
      .values({
        id: "user-001",
        studentNumber: attendanceEvent.studentNumber,
        name: "向原 大翔",
        lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
        email: "user@example.com",
        emailNormalized: "user@example.com",
        createdAt: "2026-07-12T08:00:00.000Z",
        updatedAt: "2026-07-12T08:00:00.000Z",
      })
      .run();
    const repository = createDrizzleAttendanceEventRepository(db);

    const result = repository.save(attendanceEvent, "2026-07-12T08:45:13.000Z");

    expect(result).toMatchObject({
      kind: "created",
      event: {
        ...attendanceEvent,
        userId: "user-001",
        lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
        receivedAt: "2026-07-12T08:45:13.000Z",
      },
    });
  });
});
