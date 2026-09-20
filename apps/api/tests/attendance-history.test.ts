import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser } from "../scripts/manage-user";
import { createApp } from "../src/app";
import { createSqliteDatabase } from "../src/db/client";
import { DrizzleAttendanceEventRepository } from "../src/repositories/drizzle-attendance-event-repository";
import { DrizzleAttendanceHistoryRepository } from "../src/repositories/drizzle-attendance-history-repository";
import { DrizzleAttendanceResultRepository } from "../src/repositories/drizzle-attendance-result-repository";
import { DrizzleAttendanceSessionRepository } from "../src/repositories/drizzle-attendance-session-repository";
import { DrizzleAuthRepository } from "../src/repositories/drizzle-auth-repository";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const host = "localhost:5173";
const origin = `http://${host}`;
const password = "a-secure-password";

const getCookie = (response: Response) => {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Set-Cookie header is missing");
  }
  return setCookie.split(";", 1)[0] ?? "";
};

describe("attendance history API", () => {
  let app: ReturnType<typeof createApp>;
  let cookie: string;

  beforeEach(async () => {
    const databasePath = join(
      mkdtempSync(join(tmpdir(), "smart-gate-history-test-")),
      "test.sqlite3",
    );
    const db = createSqliteDatabase(databasePath, { migrationsFolder });
    await createUser(
      db,
      {
        studentNumber: "1234567890",
        name: "利用者 一",
        lcdDisplayName: "ﾕｰｻﾞｰ 1",
        email: "user1@example.com",
        password,
      },
      { userId: "user-001" },
    );
    await createUser(
      db,
      {
        studentNumber: "0987654321",
        name: "利用者 二",
        lcdDisplayName: "ﾕｰｻﾞｰ 2",
        email: "user2@example.com",
        password,
      },
      { userId: "user-002" },
    );

    const eventRepository = new DrizzleAttendanceEventRepository(db);
    const saveEvent = (
      eventId: string,
      studentNumber: string,
      eventType: "check_in" | "check_out",
      authenticatedAt: string,
    ) =>
      eventRepository.save(
        {
          eventId,
          studentNumber,
          deviceId: "device-001",
          method: "card",
          eventType,
          authenticatedAt,
        },
        new Date(authenticatedAt).toISOString(),
      );

    saveEvent("own-in-1", "1234567890", "check_in", "2026-07-01T00:00:00Z");
    saveEvent("own-out-1", "1234567890", "check_out", "2026-07-01T08:00:00Z");
    saveEvent(
      "own-out-missing",
      "1234567890",
      "check_out",
      "2026-07-02T12:00:00+09:00",
    );
    saveEvent(
      "own-in-cross-day",
      "1234567890",
      "check_in",
      "2026-07-03T23:00:00+09:00",
    );
    saveEvent(
      "own-out-cross-day",
      "1234567890",
      "check_out",
      "2026-07-04T01:00:00+09:00",
    );
    saveEvent(
      "own-in-missing",
      "1234567890",
      "check_in",
      "2026-07-05T10:00:00+09:00",
    );
    saveEvent(
      "other-in",
      "0987654321",
      "check_in",
      "2026-07-01T10:00:00+09:00",
    );

    const sessionRepository = new DrizzleAttendanceSessionRepository(db);
    sessionRepository.create({
      sessionId: "session-001",
      auditId: "audit-session-001",
      actorUserId: "user-001",
      title: "研究ゼミ",
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2026-07-01T01:30:00.000Z",
      occurredAt: "2026-06-01T00:00:00.000Z",
    });

    app = createApp({
      authToken: "test-token",
      attendanceEventRepository: eventRepository,
      authRepository: new DrizzleAuthRepository(db),
      attendanceHistoryRepository: new DrizzleAttendanceHistoryRepository(db),
      attendanceSessionRepository: sessionRepository,
      attendanceResultRepository: new DrizzleAttendanceResultRepository(db),
      attendancePolicy: {
        receptionOpenMinutesBefore: 10,
        lateAfterMinutes: 20,
        standardClassDurationMinutes: 90,
      },
      secureCookie: false,
    });
    const loginResponse = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", host, origin },
      body: JSON.stringify({ email: "user1@example.com", password }),
    });
    cookie = getCookie(loginResponse);
  });

  it("returns only the logged-in user's monthly history", async () => {
    const response = await app.request(
      "/api/v1/attendance-events/me/monthly?month=2026-07",
      { headers: { cookie } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      month: "2026-07",
      timeZone: "Asia/Tokyo",
      attendanceSessions: [
        {
          id: "session-001",
          title: "研究ゼミ",
          startsAt: "2026-07-01T00:00:00.000Z",
          endsAt: "2026-07-01T01:30:00.000Z",
          attendanceStatus: "present",
          checkedInAt: "2026-07-01T00:00:00.000Z",
        },
      ],
      days: [
        {
          date: "2026-07-01",
          eventCount: 2,
          hasMissingCheckIn: false,
          hasMissingCheckOut: false,
          stayDurationMinutes: 480,
        },
        {
          date: "2026-07-02",
          eventCount: 1,
          hasMissingCheckIn: true,
          hasMissingCheckOut: false,
          stayDurationMinutes: 0,
        },
        {
          date: "2026-07-03",
          eventCount: 1,
          hasMissingCheckIn: false,
          hasMissingCheckOut: false,
          stayDurationMinutes: 120,
        },
        {
          date: "2026-07-04",
          eventCount: 1,
          hasMissingCheckIn: false,
          hasMissingCheckOut: false,
          stayDurationMinutes: 0,
        },
        {
          date: "2026-07-05",
          eventCount: 1,
          hasMissingCheckIn: false,
          hasMissingCheckOut: true,
          stayDurationMinutes: 0,
        },
      ],
    });
  });

  it("pairs a next-day checkout and assigns the stay to the check-in date", async () => {
    const response = await app.request(
      "/api/v1/attendance-events/me/daily?date=2026-07-03",
      { headers: { cookie } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      date: "2026-07-03",
      timeZone: "Asia/Tokyo",
      events: [
        {
          eventId: "own-in-cross-day",
          eventType: "check_in",
          method: "card",
          authenticatedAt: "2026-07-03T23:00:00+09:00",
          confidence: null,
          pairingStatus: "paired",
        },
      ],
      hasMissingCheckIn: false,
      hasMissingCheckOut: false,
      stayDurationMinutes: 120,
    });
  });

  it("rejects unauthenticated access and arbitrary user identifiers", async () => {
    const unauthenticated = await app.request(
      "/api/v1/attendance-events/me/monthly?month=2026-07",
    );
    expect(unauthenticated.status).toBe(401);

    for (const query of ["userId=user-002", "studentNumber=0987654321"]) {
      const response = await app.request(
        `/api/v1/attendance-events/me/monthly?month=2026-07&${query}`,
        { headers: { cookie } },
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects invalid calendar dates", async () => {
    const response = await app.request(
      "/api/v1/attendance-events/me/daily?date=2026-02-30",
      { headers: { cookie } },
    );

    expect(response.status).toBe(400);
  });
});
