import { eq, lte, or } from "drizzle-orm";
import { sessions, userCredentials } from "../db/auth-schema";
import type { SqliteDatabase } from "../db/client";
import { users } from "../db/user-schema";
import type { AuthRepository } from "./auth-repository";

export const createDrizzleAuthRepository = (
  db: SqliteDatabase,
): AuthRepository => ({
  findUserAuthentication(emailNormalized) {
    return (
      db
        .select({
          id: users.id,
          studentNumber: users.studentNumber,
          name: users.name,
          lcdDisplayName: users.lcdDisplayName,
          email: users.email,
          isActive: users.isActive,
          passwordHash: userCredentials.passwordHash,
          failedLoginCount: userCredentials.failedLoginCount,
          lockedUntil: userCredentials.lockedUntil,
        })
        .from(users)
        .innerJoin(userCredentials, eq(users.id, userCredentials.userId))
        .where(eq(users.emailNormalized, emailNormalized))
        .get() ?? null
    );
  },
  recordLoginFailure(userId, now, lockThreshold, lockDurationMs) {
    db.transaction((tx) => {
      const credential = tx
        .select({
          failedLoginCount: userCredentials.failedLoginCount,
          lockedUntil: userCredentials.lockedUntil,
        })
        .from(userCredentials)
        .where(eq(userCredentials.userId, userId))
        .get();

      if (!credential) {
        throw new Error(`Failed to load user credentials: ${userId}`);
      }

      if (credential.lockedUntil && credential.lockedUntil > now) {
        return;
      }

      const previousCount = credential.lockedUntil
        ? 0
        : credential.failedLoginCount;
      const failedLoginCount = previousCount + 1;
      const lockedUntil =
        failedLoginCount >= lockThreshold
          ? new Date(Date.parse(now) + lockDurationMs).toISOString()
          : null;

      tx.update(userCredentials)
        .set({ failedLoginCount, lockedUntil, updatedAt: now })
        .where(eq(userCredentials.userId, userId))
        .run();
    });
  },
  clearLoginFailures(userId, now) {
    db.update(userCredentials)
      .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: now })
      .where(eq(userCredentials.userId, userId))
      .run();
  },
  createSession(session) {
    db.insert(sessions).values(session).run();
  },
  findSession(tokenHash) {
    const row = db
      .select({
        tokenHash: sessions.tokenHash,
        userId: users.id,
        studentNumber: users.studentNumber,
        name: users.name,
        lcdDisplayName: users.lcdDisplayName,
        email: users.email,
        isUserActive: users.isActive,
        createdAt: sessions.createdAt,
        lastSeenAt: sessions.lastSeenAt,
        idleExpiresAt: sessions.idleExpiresAt,
        absoluteExpiresAt: sessions.absoluteExpiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.tokenHash, tokenHash))
      .get();

    if (!row) {
      return null;
    }

    return {
      tokenHash: row.tokenHash,
      user: {
        id: row.userId,
        studentNumber: row.studentNumber,
        name: row.name,
        lcdDisplayName: row.lcdDisplayName,
        email: row.email,
      },
      isUserActive: row.isUserActive,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      idleExpiresAt: row.idleExpiresAt,
      absoluteExpiresAt: row.absoluteExpiresAt,
    };
  },
  touchSession(tokenHash, lastSeenAt, idleExpiresAt) {
    db.update(sessions)
      .set({ lastSeenAt, idleExpiresAt })
      .where(eq(sessions.tokenHash, tokenHash))
      .run();
  },
  deleteSession(tokenHash) {
    db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
  },
  deleteExpiredSessions(now) {
    db.delete(sessions)
      .where(
        or(
          lte(sessions.idleExpiresAt, now),
          lte(sessions.absoluteExpiresAt, now),
        ),
      )
      .run();
  },
});
