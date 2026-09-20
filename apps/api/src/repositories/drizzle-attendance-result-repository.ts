import { and, asc, eq, sql } from "drizzle-orm";
import { attendanceEvents } from "../db/attendance-event-schema";
import type { SqliteDatabase } from "../db/client";
import { users } from "../db/user-schema";
import type { AttendanceResultRepository } from "./attendance-result-repository";

export class DrizzleAttendanceResultRepository
  implements AttendanceResultRepository
{
  constructor(private readonly db: SqliteDatabase) {}

  findStudentCheckIns(
    input: Parameters<AttendanceResultRepository["findStudentCheckIns"]>[0],
  ) {
    return this.db
      .select({
        checkedInAt:
          sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', ${attendanceEvents.authenticatedAt})`.as(
            "checked_in_at",
          ),
      })
      .from(attendanceEvents)
      .where(
        and(
          eq(attendanceEvents.userId, input.userId),
          eq(attendanceEvents.eventType, "check_in"),
          sql`julianday(${attendanceEvents.authenticatedAt}) >= julianday(${input.from})`,
          sql`julianday(${attendanceEvents.authenticatedAt}) < julianday(${input.toExclusive})`,
        ),
      )
      .orderBy(asc(attendanceEvents.authenticatedAt))
      .all()
      .map((row) => row.checkedInAt);
  }

  listStudentsWithFirstCheckIn(
    input: Parameters<
      AttendanceResultRepository["listStudentsWithFirstCheckIn"]
    >[0],
  ) {
    return this.db
      .select({
        userId: users.id,
        studentNumber: users.studentNumber,
        name: users.name,
        firstCheckInAt: sql<
          string | null
        >`min(strftime('%Y-%m-%dT%H:%M:%fZ', ${attendanceEvents.authenticatedAt}))`.as(
          "first_check_in_at",
        ),
      })
      .from(users)
      .leftJoin(
        attendanceEvents,
        and(
          eq(attendanceEvents.userId, users.id),
          eq(attendanceEvents.eventType, "check_in"),
          sql`julianday(${attendanceEvents.authenticatedAt}) >= julianday(${input.receptionOpensAt})`,
          sql`julianday(${attendanceEvents.authenticatedAt}) < julianday(${input.endsAt})`,
        ),
      )
      .where(and(eq(users.userType, "student"), eq(users.isActive, true)))
      .groupBy(users.id, users.studentNumber, users.name)
      .orderBy(asc(users.studentNumber), asc(users.id))
      .all()
      .map((row) => ({
        ...row,
        // 生徒にはDB制約で学籍番号が必須だが、型上のnullableを境界で絞る。
        studentNumber: row.studentNumber as string,
      }));
  }
}
