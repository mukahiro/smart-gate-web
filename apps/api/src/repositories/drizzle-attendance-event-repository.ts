import { eq } from "drizzle-orm";
import { attendanceEvents } from "../db/attendance-event-schema";
import type { SqliteDatabase } from "../db/client";
import { users } from "../db/user-schema";
import type {
  AttendanceEventRepository,
  StoredAttendanceEvent,
} from "./attendance-event-repository";

type AttendanceEventRow = typeof attendanceEvents.$inferSelect & {
  lcdDisplayName: string | null;
};

const rowToStoredEvent = (row: AttendanceEventRow): StoredAttendanceEvent => ({
  eventId: row.eventId,
  studentNumber: row.studentNumberSnapshot,
  userId: row.userId,
  lcdDisplayName: row.lcdDisplayName,
  deviceId: row.deviceId,
  method: row.method,
  eventType: row.eventType,
  authenticatedAt: row.authenticatedAt,
  receivedAt: row.receivedAt,
  ...(row.confidence === null ? {} : { confidence: row.confidence }),
});

export const createDrizzleAttendanceEventRepository = (
  db: SqliteDatabase,
): AttendanceEventRepository => ({
  save(event, receivedAt) {
    return db.transaction((tx) => {
      const user = tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.studentNumber, event.studentNumber))
        .get();
      const insertResult = tx
        .insert(attendanceEvents)
        .values({
          eventId: event.eventId,
          studentNumberSnapshot: event.studentNumber,
          userId: user?.id ?? null,
          deviceId: event.deviceId,
          method: event.method,
          eventType: event.eventType,
          authenticatedAt: event.authenticatedAt,
          receivedAt,
          confidence: event.confidence ?? null,
        })
        .onConflictDoNothing()
        .run();
      const row = tx
        .select({
          eventId: attendanceEvents.eventId,
          studentNumberSnapshot: attendanceEvents.studentNumberSnapshot,
          userId: attendanceEvents.userId,
          deviceId: attendanceEvents.deviceId,
          method: attendanceEvents.method,
          eventType: attendanceEvents.eventType,
          authenticatedAt: attendanceEvents.authenticatedAt,
          receivedAt: attendanceEvents.receivedAt,
          confidence: attendanceEvents.confidence,
          lcdDisplayName: users.lcdDisplayName,
        })
        .from(attendanceEvents)
        .leftJoin(users, eq(attendanceEvents.userId, users.id))
        .where(eq(attendanceEvents.eventId, event.eventId))
        .get();

      if (!row) {
        throw new Error(`Failed to load attendance event: ${event.eventId}`);
      }

      return {
        kind: insertResult.changes === 1 ? "created" : "duplicate",
        event: rowToStoredEvent(row),
      };
    });
  },
});
