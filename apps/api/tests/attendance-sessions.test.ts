import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createUser } from "../scripts/manage-user";
import { createApp } from "../src/app";
import { attendanceSessions } from "../src/db/attendance-session-schema";
import { auditLogs } from "../src/db/audit-log-schema";
import { createSqliteDatabase } from "../src/db/client";
import { users } from "../src/db/user-schema";
import { DrizzleAttendanceEventRepository } from "../src/repositories/drizzle-attendance-event-repository";
import { DrizzleAttendanceSessionRepository } from "../src/repositories/drizzle-attendance-session-repository";
import { DrizzleAuthRepository } from "../src/repositories/drizzle-auth-repository";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const host = "localhost:5173";
const origin = `http://${host}`;
const password = "a-secure-password";

const getCookie = (response: Response) => {
  const value = response.headers.get("set-cookie")?.split(";", 1)[0];
  if (!value) throw new Error("Set-Cookie header is missing");
  return value;
};

const setup = async () => {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "smart-gate-attendance-sessions-test-")),
    "test.sqlite3",
  );
  const db = createSqliteDatabase(databasePath, { migrationsFolder });
  await createUser(
    db,
    {
      studentNumber: "1111111111",
      name: "先生",
      lcdDisplayName: "TEACHER",
      email: "teacher@example.com",
      password,
    },
    { userId: "teacher-001" },
  );
  db.update(users)
    .set({ userType: "teacher" })
    .where(eq(users.id, "teacher-001"))
    .run();
  await createUser(
    db,
    {
      studentNumber: "2222222222",
      name: "管理者生徒",
      lcdDisplayName: "ADMIN",
      email: "admin@example.com",
      password,
    },
    { userId: "admin-001", isAdmin: true },
  );
  const app = createApp({
    authToken: "test-token",
    attendanceEventRepository: new DrizzleAttendanceEventRepository(db),
    authRepository: new DrizzleAuthRepository(db),
    attendanceSessionRepository: new DrizzleAttendanceSessionRepository(db),
    secureCookie: false,
  });
  const login = async (email: string) =>
    getCookie(
      await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", host, origin },
        body: JSON.stringify({ email, password }),
      }),
    );
  return {
    app,
    db,
    teacherCookie: await login("teacher@example.com"),
    adminCookie: await login("admin@example.com"),
  };
};

describe("attendance sessions API", () => {
  it("lets every teacher create, read, update and cancel a session", async () => {
    const { app, db, teacherCookie } = await setup();
    const headers = {
      "content-type": "application/json",
      cookie: teacherCookie,
      host,
      origin,
    };
    const createdResponse = await app.request("/api/v1/attendance-sessions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "データベース演習",
        startsAt: "2026-10-01T09:00:00+09:00",
        endsAt: "2026-10-01T10:30:00+09:00",
      }),
    });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as {
      session: { id: string; updatedAt: string; startsAt: string };
    };
    expect(created.session.startsAt).toBe("2026-10-01T00:00:00.000Z");

    const listResponse = await app.request("/api/v1/attendance-sessions", {
      headers: { cookie: teacherCookie },
    });
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      sessions: [{ id: created.session.id, title: "データベース演習" }],
    });

    const updatedResponse = await app.request(
      `/api/v1/attendance-sessions/${created.session.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: "データベース演習（第1回）",
          expectedUpdatedAt: created.session.updatedAt,
        }),
      },
    );
    expect(updatedResponse.status).toBe(200);
    const updated = (await updatedResponse.json()) as {
      session: { updatedAt: string };
    };
    expect(updated.session.updatedAt).not.toBe(created.session.updatedAt);

    const staleResponse = await app.request(
      `/api/v1/attendance-sessions/${created.session.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: "古い画面からの更新",
          expectedUpdatedAt: created.session.updatedAt,
        }),
      },
    );
    expect(staleResponse.status).toBe(409);
    await expect(staleResponse.json()).resolves.toMatchObject({
      error: { code: "ATTENDANCE_SESSION_CONFLICT" },
    });

    const cancelledResponse = await app.request(
      `/api/v1/attendance-sessions/${created.session.id}/cancel`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ expectedUpdatedAt: updated.session.updatedAt }),
      },
    );
    expect(cancelledResponse.status).toBe(200);
    await expect(cancelledResponse.json()).resolves.toMatchObject({
      session: { status: "cancelled" },
    });

    expect(
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.resourceId, created.session.id))
        .all()
        .map((log) => log.action),
    ).toEqual([
      "attendance_session_created",
      "attendance_session_updated",
      "attendance_session_cancelled",
    ]);
    expect(
      db
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.id, created.session.id))
        .get()?.title,
    ).toBe("データベース演習（第1回）");
  });

  it("rejects a student administrator and protects mutations by origin", async () => {
    const { app, adminCookie, teacherCookie } = await setup();
    expect(
      (
        await app.request("/api/v1/attendance-sessions", {
          headers: { cookie: adminCookie },
        })
      ).status,
    ).toBe(403);

    const response = await app.request("/api/v1/attendance-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: teacherCookie,
        host,
        origin: "http://evil.example",
      },
      body: JSON.stringify({
        title: "不正な作成",
        startsAt: "2026-10-01T09:00:00+09:00",
        endsAt: "2026-10-01T10:30:00+09:00",
      }),
    });
    expect(response.status).toBe(403);
  });

  it("validates the complete period when only one endpoint is updated", async () => {
    const { app, teacherCookie } = await setup();
    const headers = {
      "content-type": "application/json",
      cookie: teacherCookie,
      host,
      origin,
    };
    const createdResponse = await app.request("/api/v1/attendance-sessions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "演習",
        startsAt: "2026-10-01T09:00:00+09:00",
        endsAt: "2026-10-01T10:30:00+09:00",
      }),
    });
    const created = (await createdResponse.json()) as {
      session: { id: string; updatedAt: string };
    };
    const response = await app.request(
      `/api/v1/attendance-sessions/${created.session.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          startsAt: "2026-10-01T11:00:00+09:00",
          expectedUpdatedAt: created.session.updatedAt,
        }),
      },
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });
});
