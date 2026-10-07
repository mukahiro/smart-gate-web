import type { AttendanceSession } from "../../repositories/attendance-session-repository";

export type AttendanceSessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export const getAttendanceSessionStatus = (
  session: AttendanceSession,
  now: Date,
): AttendanceSessionStatus => {
  if (session.cancelledAt !== null) return "cancelled";
  const timestamp = now.getTime();
  if (timestamp < Date.parse(session.startsAt)) return "scheduled";
  if (timestamp < Date.parse(session.endsAt)) return "in_progress";
  return "completed";
};

export const toAttendanceSessionView = (
  session: AttendanceSession,
  now: Date,
) => ({ ...session, status: getAttendanceSessionStatus(session, now) });

export const nextVersionTimestamp = (now: Date, previous: string): string =>
  new Date(Math.max(now.getTime(), Date.parse(previous) + 1)).toISOString();
