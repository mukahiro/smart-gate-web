import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSqliteDatabase } from "../db/client";
import type { AttendanceEventInput } from "../schemas/attendance-event";
import { createDrizzleAttendanceEventRepository } from "./drizzle-attendance-event-repository";

const createDatabasePath = () =>
  join(mkdtempSync(join(tmpdir(), "smart-gate-api-test-")), "test.sqlite3");

const attendanceEvent: AttendanceEventInput = {
  eventId: "event-001",
  personId: "person-001",
  deviceId: "device-001",
  method: "card",
  eventType: "check_in",
  authenticatedAt: "2026-07-12T08:45:12+09:00",
};

const createAttendanceEventRepository = (databasePath: string) =>
  createDrizzleAttendanceEventRepository(createSqliteDatabase(databasePath));

describe("createDrizzleAttendanceEventRepository", () => {
  it("saves attendance events to SQLite", () => {
    const repository = createAttendanceEventRepository(createDatabasePath());

    const result = repository.save(attendanceEvent, "2026-07-12T08:45:13.000Z");

    expect(result).toMatchObject({
      kind: "created",
      event: {
        ...attendanceEvent,
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
        personId: "person-changed",
      },
      "2026-07-12T08:45:14.000Z",
    );

    expect(firstResult.kind).toBe("created");
    expect(secondResult).toMatchObject({
      kind: "duplicate",
      event: {
        ...attendanceEvent,
        receivedAt: "2026-07-12T08:45:13.000Z",
      },
    });
  });
});
