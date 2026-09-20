import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { attendanceEvents } from "../src/db/attendance-event-schema";
import { attendanceSessions } from "../src/db/attendance-session-schema";
import { createSqliteDatabase } from "../src/db/client";
import { users } from "../src/db/user-schema";
import { DrizzleAttendanceResultRepository } from "../src/repositories/drizzle-attendance-result-repository";
import { DrizzleAttendanceSessionRepository } from "../src/repositories/drizzle-attendance-session-repository";
import { calculateAttendanceStatus } from "../src/services/attendance-sessions/calculate-attendance-status";
import { GetAttendanceSessionResultsUseCase } from "../src/services/attendance-sessions/get-attendance-session-results";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const timestamp = "2026-09-01T00:00:00.000Z";

describe("attendance results", () => {
  it("uses each active student's first check-in within the reception period", () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-attendance-results-test-")),
      "test.sqlite3",
    );
    const db = createSqliteDatabase(databasePath, { migrationsFolder });
    db.insert(users)
      .values([
        {
          id: "teacher-001",
          studentNumber: null,
          name: "先生",
          lcdDisplayName: null,
          email: "teacher@example.com",
          emailNormalized: "teacher@example.com",
          userType: "teacher",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...Array.from({ length: 7 }, (_, index) => ({
          id: `student-00${index + 1}`,
          studentNumber: `000000000${index + 1}`,
          name: `生徒${index + 1}`,
          lcdDisplayName: `STUDENT ${index + 1}`,
          email: `student${index + 1}@example.com`,
          emailNormalized: `student${index + 1}@example.com`,
          userType: "student" as const,
          isActive: index !== 6,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      ])
      .run();
    db.insert(attendanceSessions)
      .values({
        id: "session-001",
        title: "授業",
        startsAt: "2026-10-01T00:00:00.000Z",
        endsAt: "2026-10-01T01:00:00.000Z",
        createdByUserId: "teacher-001",
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    db.insert(attendanceEvents)
      .values([
        event("open-boundary", "student-001", "2026-10-01T08:50:00+09:00"),
        event("cutoff-boundary", "student-002", "2026-10-01T09:20:00+09:00"),
        event("late-first", "student-003", "2026-10-01T09:20:00.001+09:00"),
        event("late-second", "student-003", "2026-10-01T09:40:00+09:00"),
        event("end-boundary", "student-004", "2026-10-01T10:00:00+09:00"),
        event("too-early", "student-005", "2026-10-01T08:49:59.999+09:00"),
        event(
          "check-out-only",
          "student-006",
          "2026-10-01T09:10:00+09:00",
          "check_out",
        ),
        event("inactive", "student-007", "2026-10-01T09:00:00+09:00"),
      ])
      .run();

    const result = new GetAttendanceSessionResultsUseCase(
      new DrizzleAttendanceSessionRepository(db),
      new DrizzleAttendanceResultRepository(db),
      {
        receptionOpenMinutesBefore: 10,
        lateAfterMinutes: 20,
        standardClassDurationMinutes: 90,
      },
      () => new Date("2026-10-01T01:00:00.000Z"),
    ).execute("session-001");

    expect(
      result.students.map(({ studentNumber, status, checkedInAt }) => ({
        studentNumber,
        status,
        checkedInAt,
      })),
    ).toEqual([
      {
        studentNumber: "0000000001",
        status: "present",
        checkedInAt: "2026-09-30T23:50:00.000Z",
      },
      {
        studentNumber: "0000000002",
        status: "present",
        checkedInAt: "2026-10-01T00:20:00.000Z",
      },
      {
        studentNumber: "0000000003",
        status: "late",
        checkedInAt: "2026-10-01T00:20:00.001Z",
      },
      { studentNumber: "0000000004", status: "absent", checkedInAt: null },
      { studentNumber: "0000000005", status: "absent", checkedInAt: null },
      { studentNumber: "0000000006", status: "absent", checkedInAt: null },
    ]);
    expect(result.summary).toEqual({
      targetStudentCount: 6,
      presentCount: 2,
      lateCount: 1,
      absentCount: 3,
      pendingCount: 0,
      unregisteredCount: 0,
      cancelledCount: 0,
    });
  });

  it.each([
    ["2026-09-30T23:59:59.999Z", "pending"],
    ["2026-10-01T00:00:00.000Z", "unregistered"],
    ["2026-10-01T00:59:59.999Z", "unregistered"],
    ["2026-10-01T01:00:00.000Z", "absent"],
  ] as const)("shows a missing registration at %s as %s", (now, expected) => {
    expect(
      calculateAttendanceStatus({
        now: new Date(now),
        startsAt: "2026-10-01T00:00:00.000Z",
        endsAt: "2026-10-01T01:00:00.000Z",
        lateCutoffAt: "2026-10-01T00:20:00.000Z",
        firstCheckInAt: null,
        cancelled: false,
      }),
    ).toBe(expected);
  });
});

const event = (
  eventId: string,
  userId: string,
  authenticatedAt: string,
  eventType: "check_in" | "check_out" = "check_in",
) => ({
  eventId,
  studentNumberSnapshot: userId.replace("student-", "0000000"),
  userId,
  deviceId: "device-001",
  method: "card" as const,
  eventType,
  authenticatedAt,
  receivedAt: timestamp,
});
