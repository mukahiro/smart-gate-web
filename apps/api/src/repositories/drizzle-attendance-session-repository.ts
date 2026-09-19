import { and, asc, desc, eq } from "drizzle-orm";
import { attendanceSessions } from "../db/attendance-session-schema";
import { auditLogs } from "../db/audit-log-schema";
import type { SqliteDatabase } from "../db/client";
import type {
  AttendanceSession,
  AttendanceSessionRepository,
} from "./attendance-session-repository";

export class DrizzleAttendanceSessionRepository
  implements AttendanceSessionRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  list(): AttendanceSession[] {
    return this.db
      .select()
      .from(attendanceSessions)
      .orderBy(desc(attendanceSessions.startsAt), desc(attendanceSessions.id))
      .all();
  }

  findById(id: string): AttendanceSession | null {
    return (
      this.db
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.id, id))
        .get() ?? null
    );
  }

  listAuditLogs(sessionId: string) {
    return this.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, "attendance_session"),
          eq(auditLogs.resourceId, sessionId),
        ),
      )
      .orderBy(asc(auditLogs.occurredAt), asc(auditLogs.id))
      .all()
      .map((row) => ({
        id: row.id,
        actorUserId: row.actorUserId,
        action: row.action as
          | "attendance_session_created"
          | "attendance_session_updated"
          | "attendance_session_cancelled",
        occurredAt: row.occurredAt,
        changedFields: JSON.parse(row.changedFields) as string[],
        changes: row.changes
          ? (JSON.parse(row.changes) as Record<
              string,
              { before: unknown; after: unknown }
            >)
          : null,
      }));
  }

  create(input: Parameters<AttendanceSessionRepository["create"]>[0]) {
    return this.db.transaction((tx) => {
      const session: AttendanceSession = {
        id: input.sessionId,
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        createdByUserId: input.actorUserId,
        cancelledAt: null,
        createdAt: input.occurredAt,
        updatedAt: input.occurredAt,
      };
      tx.insert(attendanceSessions).values(session).run();
      tx.insert(auditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action: "attendance_session_created",
          resourceType: "attendance_session",
          resourceId: input.sessionId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify(["title", "startsAt", "endsAt"]),
          changes: JSON.stringify({
            title: { before: null, after: input.title },
            startsAt: { before: null, after: input.startsAt },
            endsAt: { before: null, after: input.endsAt },
          }),
        })
        .run();
      return session;
    });
  }

  update(input: Parameters<AttendanceSessionRepository["update"]>[0]) {
    return this.db.transaction((tx) => {
      const current = tx
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.id, input.sessionId))
        .get();
      if (!current) return { kind: "not_found" as const };
      if (current.updatedAt !== input.expectedUpdatedAt) {
        return { kind: "conflict" as const };
      }

      const changedFields = (["title", "startsAt", "endsAt"] as const).filter(
        (field) =>
          input.values[field] !== undefined &&
          input.values[field] !== current[field],
      );
      if (changedFields.length === 0) {
        return { kind: "success" as const, session: current, changed: false };
      }
      const changes = Object.fromEntries(
        changedFields.map((field) => [
          field,
          { before: current[field], after: input.values[field] },
        ]),
      );
      const updated = {
        ...current,
        ...input.values,
        updatedAt: input.occurredAt,
      };
      const result = tx
        .update(attendanceSessions)
        .set({ ...input.values, updatedAt: input.occurredAt })
        .where(
          and(
            eq(attendanceSessions.id, input.sessionId),
            eq(attendanceSessions.updatedAt, input.expectedUpdatedAt),
          ),
        )
        .run();
      if (result.changes !== 1) return { kind: "conflict" as const };
      tx.insert(auditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action: "attendance_session_updated",
          resourceType: "attendance_session",
          resourceId: input.sessionId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify(changedFields),
          changes: JSON.stringify(changes),
        })
        .run();
      return { kind: "success" as const, session: updated, changed: true };
    });
  }

  cancel(input: Parameters<AttendanceSessionRepository["cancel"]>[0]) {
    return this.db.transaction((tx) => {
      const current = tx
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.id, input.sessionId))
        .get();
      if (!current) return { kind: "not_found" as const };
      if (current.updatedAt !== input.expectedUpdatedAt) {
        return { kind: "conflict" as const };
      }
      if (current.cancelledAt !== null) {
        return { kind: "success" as const, session: current, changed: false };
      }

      const session = {
        ...current,
        cancelledAt: input.occurredAt,
        updatedAt: input.occurredAt,
      };
      const result = tx
        .update(attendanceSessions)
        .set({
          cancelledAt: input.occurredAt,
          updatedAt: input.occurredAt,
        })
        .where(
          and(
            eq(attendanceSessions.id, input.sessionId),
            eq(attendanceSessions.updatedAt, input.expectedUpdatedAt),
          ),
        )
        .run();
      if (result.changes !== 1) return { kind: "conflict" as const };
      tx.insert(auditLogs)
        .values({
          id: input.auditId,
          actorUserId: input.actorUserId,
          action: "attendance_session_cancelled",
          resourceType: "attendance_session",
          resourceId: input.sessionId,
          occurredAt: input.occurredAt,
          changedFields: JSON.stringify(["cancelledAt"]),
          changes: JSON.stringify({
            cancelledAt: { before: null, after: input.occurredAt },
          }),
        })
        .run();
      return { kind: "success" as const, session, changed: true };
    });
  }
}
