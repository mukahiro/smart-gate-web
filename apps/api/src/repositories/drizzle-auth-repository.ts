import { eq, lte, or } from "drizzle-orm";
import { sessions, userCredentials } from "../db/auth-schema";
import type { SqliteDatabase } from "../db/client";
import { users } from "../db/user-schema";
import type {
  AuthRepository,
  CreateSessionInput,
  StoredSession,
  UserAuthenticationRecord,
} from "./auth-repository";

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findUserAuthentication(
    emailNormalized: string,
  ): UserAuthenticationRecord | null {
    return (
      this.db
        .select({
          id: users.id,
          studentNumber: users.studentNumber,
          name: users.name,
          lcdDisplayName: users.lcdDisplayName,
          email: users.email,
          userType: users.userType,
          isAdmin: users.isAdmin,
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
  }

  recordLoginFailure(
    userId: string,
    now: string,
    lockThreshold: number,
    lockDurationMs: number,
  ): void {
    this.db.transaction((tx) => {
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

      // ロック期間が終了した後の失敗は、新しい試行回数として数え直す。
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
  }

  clearLoginFailures(userId: string, now: string): void {
    this.db
      .update(userCredentials)
      .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: now })
      .where(eq(userCredentials.userId, userId))
      .run();
  }

  createSession(session: CreateSessionInput): void {
    this.db.insert(sessions).values(session).run();
  }

  findSession(tokenHash: string): StoredSession | null {
    const row = this.db
      .select({
        tokenHash: sessions.tokenHash,
        userId: users.id,
        studentNumber: users.studentNumber,
        name: users.name,
        lcdDisplayName: users.lcdDisplayName,
        email: users.email,
        userType: users.userType,
        isAdmin: users.isAdmin,
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
        userType: row.userType,
        isAdmin: row.isAdmin,
      },
      isUserActive: row.isUserActive,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      idleExpiresAt: row.idleExpiresAt,
      absoluteExpiresAt: row.absoluteExpiresAt,
    };
  }

  touchSession(
    tokenHash: string,
    lastSeenAt: string,
    idleExpiresAt: string,
  ): void {
    this.db
      .update(sessions)
      .set({ lastSeenAt, idleExpiresAt })
      .where(eq(sessions.tokenHash, tokenHash))
      .run();
  }

  deleteSession(tokenHash: string): void {
    this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
  }

  deleteExpiredSessions(now: string): void {
    this.db
      .delete(sessions)
      .where(
        or(
          lte(sessions.idleExpiresAt, now),
          lte(sessions.absoluteExpiresAt, now),
        ),
      )
      .run();
  }

  changePassword(input: {
    userId: string;
    passwordHash: string;
    changedAt: string;
  }): boolean {
    return this.db.transaction((tx) => {
      const updated = tx
        .update(userCredentials)
        .set({
          passwordHash: input.passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: input.changedAt,
          updatedAt: input.changedAt,
        })
        .where(eq(userCredentials.userId, input.userId))
        .run();
      if (updated.changes !== 1) {
        return false;
      }
      tx.delete(sessions).where(eq(sessions.userId, input.userId)).run();
      return true;
    });
  }
}
