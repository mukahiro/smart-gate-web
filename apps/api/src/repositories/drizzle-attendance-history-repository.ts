import { and, asc, desc, eq, sql } from "drizzle-orm";
import { attendanceEvents } from "../db/attendance-event-schema";
import type { SqliteDatabase } from "../db/client";
import type {
  AttendanceHistoryEvent,
  AttendanceHistoryRepository,
} from "./attendance-history-repository";

const selectedEvent = {
  eventId: attendanceEvents.eventId,
  eventType: attendanceEvents.eventType,
  method: attendanceEvents.method,
  authenticatedAt: attendanceEvents.authenticatedAt,
  confidence: attendanceEvents.confidence,
};

export class DrizzleAttendanceHistoryRepository
  implements AttendanceHistoryRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  findInRange(
    userId: string,
    from: string,
    toExclusive: string,
  ): AttendanceHistoryEvent[] {
    return this.db
      .select(selectedEvent)
      .from(attendanceEvents)
      .where(
        and(
          eq(attendanceEvents.userId, userId),
          sql`unixepoch(${attendanceEvents.authenticatedAt}) >= unixepoch(${from})`,
          sql`unixepoch(${attendanceEvents.authenticatedAt}) < unixepoch(${toExclusive})`,
        ),
      )
      .orderBy(
        asc(sql`unixepoch(${attendanceEvents.authenticatedAt})`),
        asc(attendanceEvents.eventId),
      )
      .all();
  }

  findLastBefore(
    userId: string,
    before: string,
  ): AttendanceHistoryEvent | null {
    return (
      this.db
        .select(selectedEvent)
        .from(attendanceEvents)
        .where(
          and(
            eq(attendanceEvents.userId, userId),
            sql`unixepoch(${attendanceEvents.authenticatedAt}) < unixepoch(${before})`,
          ),
        )
        .orderBy(
          desc(sql`unixepoch(${attendanceEvents.authenticatedAt})`),
          desc(attendanceEvents.eventId),
        )
        .get() ?? null
    );
  }

  findFirstAtOrAfter(
    userId: string,
    from: string,
  ): AttendanceHistoryEvent | null {
    return (
      this.db
        .select(selectedEvent)
        .from(attendanceEvents)
        .where(
          and(
            eq(attendanceEvents.userId, userId),
            sql`unixepoch(${attendanceEvents.authenticatedAt}) >= unixepoch(${from})`,
          ),
        )
        .orderBy(
          asc(sql`unixepoch(${attendanceEvents.authenticatedAt})`),
          asc(attendanceEvents.eventId),
        )
        .get() ?? null
    );
  }
}
