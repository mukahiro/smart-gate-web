import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createUser } from "../scripts/manage-user";
import { createApp } from "../src/app";
import type { FaceImage } from "../src/clients/face-auth-client";
import { adminAuditLogs } from "../src/db/admin-audit-log-schema";
import { attendanceEvents } from "../src/db/attendance-event-schema";
import { createSqliteDatabase } from "../src/db/client";
import { DrizzleAdminRepository } from "../src/repositories/drizzle-admin-repository";
import { DrizzleAttendanceEventRepository } from "../src/repositories/drizzle-attendance-event-repository";
import { DrizzleAttendanceHistoryRepository } from "../src/repositories/drizzle-attendance-history-repository";
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

const setup = async () => {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "smart-gate-admin-test-")),
    "test.sqlite3",
  );
  const db = createSqliteDatabase(databasePath, { migrationsFolder });
  await createUser(
    db,
    {
      studentNumber: "1111111111",
      name: "管理者",
      lcdDisplayName: "ADMIN",
      email: "admin@example.com",
      password,
    },
    { userId: "admin-001", isAdmin: true },
  );
  await createUser(
    db,
    {
      studentNumber: "2222222222",
      name: "一般利用者",
      lcdDisplayName: "MEMBER",
      email: "member@example.com",
      password,
    },
    { userId: "member-001" },
  );
  const faceRegistrations: Array<{
    studentNumber: string;
    images: FaceImage[];
  }> = [];
  const attendanceEventRepository = new DrizzleAttendanceEventRepository(db);
  const app = createApp({
    authToken: "test-token",
    attendanceEventRepository,
    authRepository: new DrizzleAuthRepository(db),
    adminRepository: new DrizzleAdminRepository(db),
    attendanceHistoryRepository: new DrizzleAttendanceHistoryRepository(db),
    secureCookie: false,
    faceAuthClient: {
      async replaceFaceImages(studentNumber, images) {
        faceRegistrations.push({ studentNumber, images });
      },
    },
  });
  const login = async (email: string, loginPassword = password) =>
    app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", host, origin },
      body: JSON.stringify({ email, password: loginPassword }),
    });
  const adminLoginResponse = await login("admin@example.com");
  const adminCookie = getCookie(adminLoginResponse);
  const memberCookie = getCookie(await login("member@example.com"));
  const mutate = (path: string, cookie = adminCookie, body?: unknown) =>
    app.request(path, {
      method: "POST",
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        cookie,
        host,
        origin,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  return {
    app,
    db,
    login,
    adminLoginResponse,
    adminCookie,
    memberCookie,
    mutate,
    faceRegistrations,
    attendanceEventRepository,
  };
};

describe("admin API", () => {
  it("allows admins to list all users and rejects members", async () => {
    const { app, adminLoginResponse, adminCookie, memberCookie } =
      await setup();
    await expect(adminLoginResponse.json()).resolves.toMatchObject({
      user: { id: "admin-001", userType: "student", isAdmin: true },
    });

    for (const path of ["/api/v1/admin/users", "/api/v1/admin/audit-logs"]) {
      const memberResponse = await app.request(path, {
        headers: { cookie: memberCookie },
      });
      expect(memberResponse.status).toBe(403);
    }

    const response = await app.request("/api/v1/admin/users", {
      headers: { cookie: adminCookie },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      users: [
        {
          studentNumber: "1111111111",
          userType: "student",
          isAdmin: true,
        },
        {
          studentNumber: "2222222222",
          userType: "student",
          isAdmin: false,
        },
      ],
    });

    const otherHistory = await app.request(
      "/api/v1/attendance-events/me/monthly?month=2026-09&userId=member-001",
      { headers: { cookie: adminCookie } },
    );
    expect(otherHistory.status).toBe(400);
  });

  it("creates members with a one-time temporary password and audit log", async () => {
    const { app, db, login, adminCookie, attendanceEventRepository } =
      await setup();
    attendanceEventRepository.save(
      {
        eventId: "unmatched-event-001",
        studentNumber: "3333333333",
        deviceId: "device-001",
        method: "card",
        eventType: "check_in",
        authenticatedAt: "2026-09-01T09:00:00+09:00",
      },
      new Date("2026-09-01T09:00:01+09:00").toISOString(),
    );
    const response = await app.request("/api/v1/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
        host,
        origin,
      },
      body: JSON.stringify({
        userType: "student",
        studentNumber: "3333333333",
        name: "新規利用者",
        lcdDisplayName: "NEW USER",
        email: "new@example.com",
      }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as {
      user: {
        id: string;
        userType: string;
        isAdmin: boolean;
        faceImageCount: number;
      };
      temporaryPassword: string;
      linkedEventCount: number;
    };
    expect(body.user).toMatchObject({ userType: "student", isAdmin: false });
    expect(body.user.faceImageCount).toBe(0);
    expect(body.linkedEventCount).toBe(1);
    expect(body.temporaryPassword).toMatch(/^[A-Z2-9]{12}$/);
    expect(body.temporaryPassword).not.toMatch(/[ILO01]/);
    expect(
      (await login("new@example.com", body.temporaryPassword)).status,
    ).toBe(200);
    expect(db.select().from(adminAuditLogs).all()).toHaveLength(1);
    expect(db.select().from(adminAuditLogs).get()).toMatchObject({
      actorUserId: "admin-001",
      action: "user_created",
    });
    expect(db.select().from(attendanceEvents).get()).toMatchObject({
      eventId: "unmatched-event-001",
      userId: body.user.id,
    });
  });

  it("creates teachers without student numbers or LCD names", async () => {
    const { app, db, login, adminCookie, faceRegistrations } = await setup();
    const response = await app.request("/api/v1/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
        host,
        origin,
      },
      body: JSON.stringify({
        userType: "teacher",
        studentNumber: null,
        name: "先生利用者",
        lcdDisplayName: null,
        email: "teacher@example.com",
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      user: {
        id: string;
        studentNumber: null;
        lcdDisplayName: null;
        userType: string;
        isAdmin: boolean;
      };
      temporaryPassword: string;
      linkedEventCount: number;
    };
    expect(body.user).toMatchObject({
      studentNumber: null,
      lcdDisplayName: null,
      userType: "teacher",
      isAdmin: false,
    });
    expect(body.linkedEventCount).toBe(0);
    const teacherLogin = await login(
      "teacher@example.com",
      body.temporaryPassword,
    );
    expect(teacherLogin.status).toBe(200);
    await expect(teacherLogin.json()).resolves.toMatchObject({
      user: {
        studentNumber: null,
        lcdDisplayName: null,
        userType: "teacher",
        isAdmin: false,
      },
    });

    const faceImages = new FormData();
    faceImages.append(
      "images",
      new Blob(["image"], { type: "image/jpeg" }),
      "teacher.jpg",
    );
    const faceResponse = await app.request(
      `/api/v1/admin/users/${body.user.id}/face-images`,
      {
        method: "PUT",
        headers: { cookie: adminCookie, host, origin },
        body: faceImages,
      },
    );
    expect(faceResponse.status).toBe(409);
    expect(faceRegistrations).toHaveLength(0);
    expect(db.select().from(adminAuditLogs).get()).toMatchObject({
      action: "user_created",
    });
  });

  it("returns conflicts for duplicate identifiers and rejects protected fields", async () => {
    const { app, adminCookie } = await setup();
    const create = (studentNumber: string, email: string) =>
      app.request("/api/v1/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          host,
          origin,
        },
        body: JSON.stringify({
          userType: "student",
          studentNumber,
          name: "重複",
          lcdDisplayName: "DUP",
          email,
        }),
      });

    expect((await create("3333333333", "member@example.com")).status).toBe(409);
    expect((await create("2222222222", "unique@example.com")).status).toBe(409);

    const invalidStudent = await app.request("/api/v1/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
        host,
        origin,
      },
      body: JSON.stringify({
        userType: "student",
        studentNumber: null,
        name: "学籍番号なし生徒",
        lcdDisplayName: null,
        email: "invalid-student@example.com",
      }),
    });
    expect(invalidStudent.status).toBe(400);

    const update = await app.request("/api/v1/admin/users/member-001", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
        host,
        origin,
      },
      body: JSON.stringify({ isAdmin: true }),
    });
    expect(update.status).toBe(400);
  });

  it("replaces face images using the stored student number and records an audit log", async () => {
    const { app, db, adminCookie, faceRegistrations } = await setup();
    const body = new FormData();
    body.append(
      "images",
      new Blob(["image-1"], { type: "image/jpeg" }),
      "one.jpg",
    );
    body.append(
      "images",
      new Blob(["image-2"], { type: "image/png" }),
      "two.png",
    );

    const response = await app.request(
      "/api/v1/admin/users/member-001/face-images",
      {
        method: "PUT",
        headers: { cookie: adminCookie, host, origin },
        body,
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      user: { id: "member-001", faceImageCount: 2 },
    });
    expect(faceRegistrations).toHaveLength(1);
    expect(faceRegistrations[0]).toMatchObject({
      studentNumber: "2222222222",
      images: [{ name: "one.jpg" }, { name: "two.png" }],
    });
    expect(
      db
        .select()
        .from(adminAuditLogs)
        .all()
        .find((log) => log.action === "user_face_images_updated"),
    ).toMatchObject({
      actorUserId: "admin-001",
      targetUserId: "member-001",
      changedFields: '["faceImageCount"]',
    });
  });

  it("validates face image uploads before calling the face authentication app", async () => {
    const { app, adminCookie, faceRegistrations } = await setup();
    const tooMany = new FormData();
    for (let index = 0; index < 11; index += 1) {
      tooMany.append(
        "images",
        new Blob([String(index)], { type: "image/jpeg" }),
        `${index}.jpg`,
      );
    }
    const invalid = new FormData();
    invalid.append(
      "images",
      new Blob(["text"], { type: "text/plain" }),
      "face.txt",
    );

    for (const body of [new FormData(), tooMany, invalid]) {
      const response = await app.request(
        "/api/v1/admin/users/member-001/face-images",
        {
          method: "PUT",
          headers: { cookie: adminCookie, host, origin },
          body,
        },
      );
      expect(response.status).toBe(400);
    }
    expect(faceRegistrations).toHaveLength(0);
  });

  it("makes state operations idempotent and protects the current admin", async () => {
    const { db, adminCookie, mutate } = await setup();
    const first = await mutate("/api/v1/admin/users/member-001/disable");
    const second = await mutate("/api/v1/admin/users/member-001/disable");
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      db
        .select()
        .from(adminAuditLogs)
        .all()
        .filter((log) => log.action === "user_disabled"),
    ).toHaveLength(1);

    const selfDisable = await mutate(
      "/api/v1/admin/users/admin-001/disable",
      adminCookie,
    );
    expect(selfDisable.status).toBe(409);
  });

  it("resets passwords, revokes sessions, and supports audit cursors", async () => {
    const { app, login, memberCookie, mutate, adminCookie } = await setup();
    const reset = await mutate("/api/v1/admin/users/member-001/reset-password");
    expect(reset.status).toBe(200);
    expect(reset.headers.get("cache-control")).toBe("no-store");
    const { temporaryPassword } = (await reset.json()) as {
      temporaryPassword: string;
    };
    expect(
      (
        await app.request("/api/v1/auth/me", {
          headers: { cookie: memberCookie },
        })
      ).status,
    ).toBe(401);
    expect((await login("member@example.com")).status).toBe(401);
    expect((await login("member@example.com", temporaryPassword)).status).toBe(
      200,
    );

    await mutate("/api/v1/admin/users/member-001/disable");
    await mutate("/api/v1/admin/users/member-001/enable");
    const page1 = await app.request("/api/v1/admin/audit-logs?limit=1", {
      headers: { cookie: adminCookie },
    });
    const page1Body = (await page1.json()) as {
      logs: Array<{ id: string }>;
      nextCursor: string;
    };
    expect(page1Body.logs).toHaveLength(1);
    expect(page1Body.nextCursor).toBeTruthy();
    const page2 = await app.request(
      `/api/v1/admin/audit-logs?limit=1&cursor=${encodeURIComponent(page1Body.nextCursor)}`,
      { headers: { cookie: adminCookie } },
    );
    const page2Body = (await page2.json()) as { logs: Array<{ id: string }> };
    expect(page2Body.logs[0]?.id).not.toBe(page1Body.logs[0]?.id);

    const invalidCursor = await app.request(
      "/api/v1/admin/audit-logs?cursor=invalid",
      { headers: { cookie: adminCookie } },
    );
    expect(invalidCursor.status).toBe(400);
  });

  it("revokes every session after the user changes their password", async () => {
    const { app, login, memberCookie } = await setup();
    const secondCookie = getCookie(await login("member@example.com"));
    const response = await app.request("/api/v1/auth/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: memberCookie,
        host,
        origin,
      },
      body: JSON.stringify({
        currentPassword: password,
        newPassword: "a-new-secure-password",
      }),
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");

    for (const cookie of [memberCookie, secondCookie]) {
      expect(
        (await app.request("/api/v1/auth/me", { headers: { cookie } })).status,
      ).toBe(401);
    }
    expect((await login("member@example.com", password)).status).toBe(401);
    expect(
      (await login("member@example.com", "a-new-secure-password")).status,
    ).toBe(200);
  });
});
