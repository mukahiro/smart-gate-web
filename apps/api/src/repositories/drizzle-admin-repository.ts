import { and, asc, count, desc, eq, isNull, lt, or } from "drizzle-orm";
import { adminAuditLogs } from "../db/admin-audit-log-schema";
import { attendanceEvents } from "../db/attendance-event-schema";
import { sessions, userCredentials } from "../db/auth-schema";
import type { SqliteDatabase } from "../db/client";
import { users } from "../db/user-schema";
import type {
  AdminAuditLog,
  AdminMutationResult,
  AdminRepository,
  AdminUser,
  CreateAdminUserInput,
  UpdateAdminUserInput,
} from "./admin-repository";

const selectedUser = {
  id: users.id,
  studentNumber: users.studentNumber,
  name: users.name,
  lcdDisplayName: users.lcdDisplayName,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  failedLoginCount: userCredentials.failedLoginCount,
  lockedUntil: userCredentials.lockedUntil,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export class DrizzleAdminRepository implements AdminRepository {
  constructor(private readonly db: SqliteDatabase) {}

  listUsers(): AdminUser[] {
    return this.db
      .select(selectedUser)
      .from(users)
      .innerJoin(userCredentials, eq(users.id, userCredentials.userId))
      .orderBy(asc(users.studentNumber))
      .all();
  }

  findUser(userId: string): AdminUser | null {
    return (
      this.db
        .select(selectedUser)
        .from(users)
        .innerJoin(userCredentials, eq(users.id, userCredentials.userId))
        .where(eq(users.id, userId))
        .get() ?? null
    );
  }

  createUser(input: CreateAdminUserInput) {
    const result = this.db.transaction((tx) => {
      if (
        tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.emailNormalized, input.emailNormalized))
          .get()
      ) {
        return { kind: "email_exists" as const };
      }
      if (
        tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.studentNumber, input.studentNumber))
          .get()
      ) {
        return { kind: "student_number_exists" as const };
      }

      tx.insert(users)
        .values({
          id: input.userId,
          studentNumber: input.studentNumber,
          name: input.name,
          lcdDisplayName: input.lcdDisplayName,
          email: input.email,
          emailNormalized: input.emailNormalized,
          role: "member",
          createdAt: input.occurredAt,
          updatedAt: input.occurredAt,
        })
        .run();
      tx.insert(userCredentials)
        .values({
          userId: input.userId,
          passwordHash: input.passwordHash,
          passwordChangedAt: input.occurredAt,
          updatedAt: input.occurredAt,
        })
        .run();
      const linkedEvents = tx
        .update(attendanceEvents)
        .set({ userId: input.userId })
        .where(
          and(
            eq(attendanceEvents.studentNumberSnapshot, input.studentNumber),
            isNull(attendanceEvents.userId),
          ),
        )
        .run();
      tx.insert(adminAuditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action: "user_created",
          targetUserId: input.userId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify([
            "studentNumber",
            "name",
            "lcdDisplayName",
            "email",
          ]),
        })
        .run();
      return {
        kind: "success" as const,
        linkedEventCount: linkedEvents.changes,
      };
    });

    if (result.kind !== "success") {
      return result;
    }
    return {
      kind: "success" as const,
      user: this.findUser(input.userId) as AdminUser,
      changed: true,
      linkedEventCount: result.linkedEventCount,
    };
  }

  updateUser(input: UpdateAdminUserInput): AdminMutationResult {
    const result = this.db.transaction((tx) => {
      const current = tx
        .select()
        .from(users)
        .where(eq(users.id, input.targetUserId))
        .get();
      if (!current) {
        return { kind: "not_found" as const };
      }
      if (
        input.values.emailNormalized &&
        input.values.emailNormalized !== current.emailNormalized &&
        tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.emailNormalized, input.values.emailNormalized))
          .get()
      ) {
        return { kind: "email_exists" as const };
      }

      const changedFields = (
        ["name", "lcdDisplayName", "email"] as const
      ).filter(
        (field) =>
          input.values[field] !== undefined &&
          input.values[field] !== current[field],
      );
      if (changedFields.length === 0) {
        return { kind: "success" as const, changed: false };
      }

      tx.update(users)
        .set({ ...input.values, updatedAt: input.occurredAt })
        .where(eq(users.id, input.targetUserId))
        .run();
      tx.insert(adminAuditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action: "user_updated",
          targetUserId: input.targetUserId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify(changedFields),
        })
        .run();
      return { kind: "success" as const, changed: true };
    });

    if (result.kind !== "success") {
      return result;
    }
    return {
      ...result,
      user: this.findUser(input.targetUserId) as AdminUser,
    };
  }

  setUserActive(input: {
    auditId: string;
    actorUserId: string;
    occurredAt: string;
    targetUserId: string;
    isActive: boolean;
  }): AdminMutationResult {
    const result = this.db.transaction((tx) => {
      const target = tx
        .select()
        .from(users)
        .where(eq(users.id, input.targetUserId))
        .get();
      if (!target) {
        return { kind: "not_found" as const };
      }
      if (target.isActive === input.isActive) {
        return { kind: "success" as const, changed: false };
      }
      if (!input.isActive && target.role === "admin") {
        if (input.actorUserId === input.targetUserId) {
          return { kind: "cannot_disable_self" as const };
        }
        const activeAdminCount = tx
          .select({ value: count() })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
          .get()?.value;
        if ((activeAdminCount ?? 0) <= 1) {
          return { kind: "last_admin" as const };
        }
      }

      tx.update(users)
        .set({ isActive: input.isActive, updatedAt: input.occurredAt })
        .where(eq(users.id, input.targetUserId))
        .run();
      if (!input.isActive) {
        tx.delete(sessions)
          .where(eq(sessions.userId, input.targetUserId))
          .run();
      }
      tx.insert(adminAuditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action: input.isActive ? "user_enabled" : "user_disabled",
          targetUserId: input.targetUserId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify(["isActive"]),
        })
        .run();
      return { kind: "success" as const, changed: true };
    });

    if (result.kind !== "success") {
      return result;
    }
    return { ...result, user: this.findUser(input.targetUserId) as AdminUser };
  }

  unlockUser(input: {
    auditId: string;
    actorUserId: string;
    occurredAt: string;
    targetUserId: string;
  }): AdminMutationResult {
    return this.updateCredentialState(input, "unlock");
  }

  revokeUserSessions(input: {
    auditId: string;
    actorUserId: string;
    occurredAt: string;
    targetUserId: string;
  }) {
    const result = this.db.transaction((tx) => {
      if (
        !tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, input.targetUserId))
          .get()
      ) {
        return { kind: "not_found" as const };
      }
      const deleted = tx
        .delete(sessions)
        .where(eq(sessions.userId, input.targetUserId))
        .run();
      if (deleted.changes > 0) {
        tx.insert(adminAuditLogs)
          .values({
            id: input.auditId,
            actorUserId: input.actorUserId,
            action: "user_sessions_revoked",
            targetUserId: input.targetUserId,
            occurredAt: input.occurredAt,
            changedFields: JSON.stringify(["sessions"]),
          })
          .run();
      }
      return {
        kind: "success" as const,
        changed: deleted.changes > 0,
        revokedSessionCount: deleted.changes,
      };
    });
    if (result.kind !== "success") {
      return result;
    }
    return { ...result, user: this.findUser(input.targetUserId) as AdminUser };
  }

  resetUserPassword(input: {
    auditId: string;
    actorUserId: string;
    occurredAt: string;
    targetUserId: string;
    passwordHash: string;
  }): AdminMutationResult {
    return this.updateCredentialState(input, "reset", input.passwordHash);
  }

  listAuditLogs(input: {
    limit: number;
    cursor?: { occurredAt: string; id: string };
  }) {
    const cursorCondition = input.cursor
      ? or(
          lt(adminAuditLogs.occurredAt, input.cursor.occurredAt),
          and(
            eq(adminAuditLogs.occurredAt, input.cursor.occurredAt),
            lt(adminAuditLogs.id, input.cursor.id),
          ),
        )
      : undefined;
    const rows = this.db
      .select()
      .from(adminAuditLogs)
      .where(cursorCondition)
      .orderBy(desc(adminAuditLogs.occurredAt), desc(adminAuditLogs.id))
      .limit(input.limit + 1)
      .all();
    const hasMore = rows.length > input.limit;

    return {
      logs: rows.slice(0, input.limit).map(
        (row): AdminAuditLog => ({
          ...row,
          changedFields: JSON.parse(row.changedFields) as string[],
        }),
      ),
      hasMore,
    };
  }

  private updateCredentialState(
    input: {
      auditId: string;
      actorUserId: string;
      occurredAt: string;
      targetUserId: string;
    },
    operation: "unlock" | "reset",
    passwordHash?: string,
  ): AdminMutationResult {
    const result = this.db.transaction((tx) => {
      const credential = tx
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.userId, input.targetUserId))
        .get();
      if (!credential) {
        return { kind: "not_found" as const };
      }
      if (
        operation === "unlock" &&
        credential.failedLoginCount === 0 &&
        credential.lockedUntil === null
      ) {
        return { kind: "success" as const, changed: false };
      }

      tx.update(userCredentials)
        .set({
          ...(passwordHash
            ? { passwordHash, passwordChangedAt: input.occurredAt }
            : {}),
          failedLoginCount: 0,
          lockedUntil: null,
          updatedAt: input.occurredAt,
        })
        .where(eq(userCredentials.userId, input.targetUserId))
        .run();
      if (operation === "reset") {
        tx.delete(sessions)
          .where(eq(sessions.userId, input.targetUserId))
          .run();
      }
      tx.insert(adminAuditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action:
            operation === "reset" ? "user_password_reset" : "user_unlocked",
          targetUserId: input.targetUserId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify(
            operation === "reset"
              ? ["password", "sessions"]
              : ["failedLoginCount", "lockedUntil"],
          ),
        })
        .run();
      return { kind: "success" as const, changed: true };
    });

    if (result.kind !== "success") {
      return result;
    }
    return { ...result, user: this.findUser(input.targetUserId) as AdminUser };
  }
}
