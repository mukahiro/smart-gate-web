import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createUser,
  normalizeStudentNumber,
  resetPassword,
  setUserActive,
  setUserRole,
  unlockUser,
} from "../../scripts/manage-user";
import { attendanceEvents } from "../../src/db/attendance-event-schema";
import { sessions, userCredentials } from "../../src/db/auth-schema";
import { createSqliteDatabase } from "../../src/db/client";
import { users } from "../../src/db/user-schema";
import { DrizzleAttendanceEventRepository } from "../../src/repositories/drizzle-attendance-event-repository";

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);
const createDatabase = () => {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "smart-gate-user-test-")),
    "test.sqlite3",
  );
  return createSqliteDatabase(databasePath, { migrationsFolder });
};

describe("manage user", () => {
  it("enforces user foreign keys", () => {
    const db = createDatabase();

    expect(() =>
      db
        .insert(sessions)
        .values({
          tokenHash: "token-hash",
          userId: "missing-user",
          createdAt: "2026-07-12T09:00:00.000Z",
          lastSeenAt: "2026-07-12T09:00:00.000Z",
          idleExpiresAt: "2026-07-12T11:00:00.000Z",
          absoluteExpiresAt: "2026-07-12T21:00:00.000Z",
        })
        .run(),
    ).toThrow();
  });

  it.each([
    ["12-3456-789-0", "1234567890"],
    ["1234567890", "1234567890"],
  ])("normalizes a student number (%s)", (input, expected) => {
    expect(normalizeStudentNumber(input)).toBe(expected);
  });

  it("creates credentials and links unmatched attendance events", async () => {
    const db = createDatabase();
    new DrizzleAttendanceEventRepository(db).save(
      {
        eventId: "event-001",
        studentNumber: "1234567890",
        deviceId: "device-001",
        method: "card",
        eventType: "check_in",
        authenticatedAt: "2026-07-12T08:45:12+09:00",
      },
      "2026-07-12T08:45:13.000Z",
    );

    const result = await createUser(
      db,
      {
        studentNumber: "12-3456-789-0",
        name: "向原 大翔",
        lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
        email: "User@Example.com",
        password: "a-secure-password",
      },
      {
        userId: "user-001",
        now: "2026-07-12T09:00:00.000Z",
      },
    );

    expect(result).toEqual({ userId: "user-001", linkedEventCount: 1 });
    expect(db.select().from(users).get()).toMatchObject({
      id: "user-001",
      studentNumber: "1234567890",
      emailNormalized: "user@example.com",
    });
    const credential = db.select().from(userCredentials).get();
    expect(credential).toBeDefined();
    await expect(
      argon2.verify(credential?.passwordHash ?? "", "a-secure-password"),
    ).resolves.toBe(true);
    expect(db.select().from(attendanceEvents).get()).toMatchObject({
      eventId: "event-001",
      userId: "user-001",
    });
  });

  it("resets credentials, unlocks the user, and deletes sessions", async () => {
    const db = createDatabase();
    await createUser(
      db,
      {
        studentNumber: "1234567890",
        name: "向原 大翔",
        lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
        email: "user@example.com",
        password: "a-secure-password",
      },
      { userId: "user-001", now: "2026-07-12T09:00:00.000Z" },
    );
    db.update(userCredentials)
      .set({
        failedLoginCount: 5,
        lockedUntil: "2026-07-12T10:00:00.000Z",
      })
      .where(eq(userCredentials.userId, "user-001"))
      .run();
    db.insert(sessions)
      .values({
        tokenHash: "token-hash",
        userId: "user-001",
        createdAt: "2026-07-12T09:00:00.000Z",
        lastSeenAt: "2026-07-12T09:00:00.000Z",
        idleExpiresAt: "2026-07-12T11:00:00.000Z",
        absoluteExpiresAt: "2026-07-12T21:00:00.000Z",
      })
      .run();

    await resetPassword(
      db,
      "1234567890",
      "another-secure-password",
      "2026-07-12T09:30:00.000Z",
    );

    const credential = db.select().from(userCredentials).get();
    expect(credential).toMatchObject({
      failedLoginCount: 0,
      lockedUntil: null,
    });
    await expect(
      argon2.verify(credential?.passwordHash ?? "", "another-secure-password"),
    ).resolves.toBe(true);
    expect(db.select().from(sessions).all()).toEqual([]);
  });

  it("disables and unlocks a user", async () => {
    const db = createDatabase();
    await createUser(
      db,
      {
        studentNumber: "1234567890",
        name: "向原 大翔",
        lcdDisplayName: "ﾑｶｲﾊﾗ ﾋﾛﾄ",
        email: "user@example.com",
        password: "a-secure-password",
      },
      { userId: "user-001" },
    );
    db.update(userCredentials)
      .set({ failedLoginCount: 5, lockedUntil: "2026-07-12T10:00:00.000Z" })
      .where(eq(userCredentials.userId, "user-001"))
      .run();

    setUserActive(db, "1234567890", false);
    unlockUser(db, "1234567890");

    expect(db.select().from(users).get()?.isActive).toBe(false);
    expect(db.select().from(userCredentials).get()).toMatchObject({
      failedLoginCount: 0,
      lockedUntil: null,
    });
  });

  it("manages admin roles and preserves the last active admin", async () => {
    const db = createDatabase();
    await createUser(
      db,
      {
        studentNumber: "1234567890",
        name: "管理者一",
        lcdDisplayName: "ADMIN 1",
        email: "admin1@example.com",
        password: "a-secure-password",
      },
      { userId: "admin-001", role: "admin" },
    );

    expect(() => setUserRole(db, "1234567890", "member")).toThrow(
      "最後の有効な管理者は降格できません",
    );
    expect(() => setUserActive(db, "1234567890", false)).toThrow(
      "最後の有効な管理者は無効化できません",
    );

    await createUser(
      db,
      {
        studentNumber: "0987654321",
        name: "管理者二",
        lcdDisplayName: "ADMIN 2",
        email: "admin2@example.com",
        password: "a-secure-password",
      },
      { userId: "admin-002", role: "admin" },
    );
    setUserRole(db, "1234567890", "member");
    expect(
      db.select().from(users).where(eq(users.id, "admin-001")).get()?.role,
    ).toBe("member");
  });
});
