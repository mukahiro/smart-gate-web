import { eq } from "drizzle-orm";
import type { SqliteDatabase } from "../db/client";
import { attendanceEvents } from "../db/schema";
import type {
  AttendanceEventRepository,
  StoredAttendanceEvent,
} from "./attendance-event-repository";

type AttendanceEventRow = typeof attendanceEvents.$inferSelect;

const rowToStoredEvent = (row: AttendanceEventRow): StoredAttendanceEvent => ({
  eventId: row.eventId,
  personId: row.personId,
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
    const insertResult = db
      .insert(attendanceEvents)
      .values({
        eventId: event.eventId,
        personId: event.personId,
        deviceId: event.deviceId,
        method: event.method,
        eventType: event.eventType,
        authenticatedAt: event.authenticatedAt,
        receivedAt,
        confidence: event.confidence ?? null,
      })
      .onConflictDoNothing()
      .run();
    const row = db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.eventId, event.eventId))
      .get();

    if (!row) {
      throw new Error(`Failed to load attendance event: ${event.eventId}`);
    }

    return {
      kind: insertResult.changes === 1 ? "created" : "duplicate",
      event: rowToStoredEvent(row),
    };
  },
});
