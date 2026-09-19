import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createUser, setUserActive } from "../scripts/manage-user";
import { createApp } from "../src/app";
import { sessions, userCredentials } from "../src/db/auth-schema";
import { createSqliteDatabase } from "../src/db/client";
import { DrizzleAttendanceEventRepository } from "../src/repositories/drizzle-attendance-event-repository";
import { DrizzleAuthRepository } from "../src/repositories/drizzle-auth-repository";
import { hashSessionToken } from "../src/services/auth/session-token";

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const host = "localhost:5173";
const origin = `http://${host}`;
const password = "a-secure-password";

const setup = async () => {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "smart-gate-auth-test-")),
    "test.sqlite3",
  );
  const db = createSqliteDatabase(databasePath, { migrationsFolder });
  await createUser(
    db,
    {
      studentNumber: "1234567890",
      name: "向原 大翔",
      lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
      email: "user@example.com",
      password,
    },
    { userId: "user-001" },
  );
  const createTestApp = () =>
    createApp({
      authToken: "test-token",
      attendanceEventRepository: new DrizzleAttendanceEventRepository(db),
      authRepository: new DrizzleAuthRepository(db),
      secureCookie: false,
    });

  return { db, createTestApp };
};

const login = (app: ReturnType<typeof createApp>, loginPassword = password) =>
  app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", host, origin },
    body: JSON.stringify({
      email: "user@example.com",
      password: loginPassword,
    }),
  });

const getCookie = (response: Response) => {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Set-Cookie header is missing");
  }
  const cookie = setCookie.split(";", 1)[0];
  if (!cookie) {
    throw new Error("Session cookie is missing");
  }
  return cookie;
};

describe("web authentication API", () => {
  it("logs in, survives app recreation, returns the user, and logs out", async () => {
    const { db, createTestApp } = await setup();
    const response = await login(createTestApp());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "user-001",
        studentNumber: "1234567890",
        name: "向原 大翔",
        lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
        email: "user@example.com",
        userType: "student",
        isAdmin: false,
      },
    });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/api/v1");
    expect(setCookie).not.toContain("Secure");
    const cookie = getCookie(response);
    const rawToken = cookie.slice(cookie.indexOf("=") + 1);
    const storedSession = db.select().from(sessions).get();
    expect(storedSession?.tokenHash).toBe(hashSessionToken(rawToken));
    expect(storedSession?.tokenHash).not.toBe(rawToken);

    const restartedApp = createTestApp();
    const meResponse = await restartedApp.request("/api/v1/auth/me", {
      headers: { cookie },
    });
    expect(meResponse.status).toBe(200);

    const logoutResponse = await restartedApp.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { cookie, host, origin },
    });
    expect(logoutResponse.status).toBe(204);
    expect(db.select().from(sessions).all()).toEqual([]);
  });

  it("uses the same response for unknown users, wrong passwords, and locks", async () => {
    const { db, createTestApp } = await setup();
    const app = createTestApp();
    let wrongPasswordBody: unknown;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login(app, "incorrect-password");
      expect(response.status).toBe(401);
      wrongPasswordBody = await response.json();
    }

    expect(db.select().from(userCredentials).get()).toMatchObject({
      failedLoginCount: 5,
    });
    expect(db.select().from(userCredentials).get()?.lockedUntil).not.toBeNull();
    expect((await login(app)).status).toBe(401);

    const unknownResponse = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", host, origin },
      body: JSON.stringify({ email: "unknown@example.com", password }),
    });
    expect(unknownResponse.status).toBe(401);
    await expect(unknownResponse.json()).resolves.toEqual(wrongPasswordBody);

    db.update(userCredentials)
      .set({ lockedUntil: "2000-01-01T00:00:00.000Z" })
      .run();
    expect((await login(app)).status).toBe(200);
    expect(db.select().from(userCredentials).get()).toMatchObject({
      failedLoginCount: 0,
      lockedUntil: null,
    });
  });

  it("rejects and deletes idle and absolutely expired sessions", async () => {
    const { db, createTestApp } = await setup();
    const app = createTestApp();
    const idleLogin = await login(app);
    const idleCookie = getCookie(idleLogin);
    const idleSession = db.select().from(sessions).get();
    db.update(sessions)
      .set({ idleExpiresAt: "2000-01-01T00:00:00.000Z" })
      .where(eq(sessions.tokenHash, idleSession?.tokenHash ?? ""))
      .run();

    expect(
      (
        await app.request("/api/v1/auth/me", {
          headers: { cookie: idleCookie },
        })
      ).status,
    ).toBe(401);

    const absoluteLogin = await login(app);
    const absoluteCookie = getCookie(absoluteLogin);
    const absoluteSession = db.select().from(sessions).get();
    db.update(sessions)
      .set({ absoluteExpiresAt: "2000-01-01T00:00:00.000Z" })
      .where(eq(sessions.tokenHash, absoluteSession?.tokenHash ?? ""))
      .run();

    expect(
      (
        await app.request("/api/v1/auth/me", {
          headers: { cookie: absoluteCookie },
        })
      ).status,
    ).toBe(401);
    expect(db.select().from(sessions).all()).toEqual([]);
  });

  it("touches an active session at most once per five minutes", async () => {
    const { db, createTestApp } = await setup();
    const app = createTestApp();
    const response = await login(app);
    const cookie = getCookie(response);
    const session = db.select().from(sessions).get();
    const oldLastSeenAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    db.update(sessions)
      .set({ lastSeenAt: oldLastSeenAt })
      .where(eq(sessions.tokenHash, session?.tokenHash ?? ""))
      .run();

    expect(
      (await app.request("/api/v1/auth/me", { headers: { cookie } })).status,
    ).toBe(200);
    const firstTouch = db.select().from(sessions).get()?.lastSeenAt;
    expect(firstTouch).not.toBe(oldLastSeenAt);

    expect(
      (await app.request("/api/v1/auth/me", { headers: { cookie } })).status,
    ).toBe(200);
    expect(db.select().from(sessions).get()?.lastSeenAt).toBe(firstTouch);
  });

  it("rejects disabled users and removes their sessions", async () => {
    const { db, createTestApp } = await setup();
    const app = createTestApp();
    const response = await login(app);
    const cookie = getCookie(response);

    setUserActive(db, "1234567890", false);

    expect(
      (await app.request("/api/v1/auth/me", { headers: { cookie } })).status,
    ).toBe(401);
    expect(db.select().from(sessions).all()).toEqual([]);
    expect((await login(app)).status).toBe(401);
  });

  it("rejects login and logout requests without the same origin", async () => {
    const { createTestApp } = await setup();
    const app = createTestApp();

    const loginResponse = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password }),
    });
    expect(loginResponse.status).toBe(403);
    expect(
      (
        await app.request("/api/v1/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://attacker.example.com",
          },
          body: JSON.stringify({ email: "user@example.com", password }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request("/api/v1/auth/logout", {
          method: "POST",
        })
      ).status,
    ).toBe(403);
  });
});
