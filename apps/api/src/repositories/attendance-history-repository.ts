import type {
  AttendanceEventType,
  AttendanceMethod,
} from "../schemas/attendance-event";

export type AttendanceHistoryEvent = {
  eventId: string;
  eventType: AttendanceEventType;
  method: AttendanceMethod;
  authenticatedAt: string;
  confidence: number | null;
};

export interface AttendanceHistoryRepository {
  findInRange(
    userId: string,
    from: string,
    toExclusive: string,
  ): AttendanceHistoryEvent[];
  findLastBefore(userId: string, before: string): AttendanceHistoryEvent | null;
  findFirstAtOrAfter(
    userId: string,
    from: string,
  ): AttendanceHistoryEvent | null;
}
