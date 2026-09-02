import type {
  AttendanceHistoryEvent,
  AttendanceHistoryRepository,
} from "../../repositories/attendance-history-repository";
import { getJapanMonthRange, historyTimeZone, toJapanDate } from "./japan-date";
import { summarizeAttendanceHistory } from "./summarize-attendance-history";

type MonthlyHistoryDay = {
  date: string;
  eventCount: number;
  hasMissingCheckIn: boolean;
  hasMissingCheckOut: boolean;
  stayDurationMinutes: number;
};

const withBoundaryEvents = (
  events: AttendanceHistoryEvent[],
  previousEvent: AttendanceHistoryEvent | null,
  nextEvent: AttendanceHistoryEvent | null,
) => [
  ...(previousEvent ? [previousEvent] : []),
  ...events,
  ...(nextEvent ? [nextEvent] : []),
];

export class GetMonthlyAttendanceHistoryUseCase {
  constructor(private readonly repository: AttendanceHistoryRepository) {}

  execute(userId: string, month: string) {
    const { from, toExclusive } = getJapanMonthRange(month);
    const events = this.repository.findInRange(userId, from, toExclusive);
    // 境界外の直近イベントも含め、月をまたぐ入退室を正しく対応付ける。
    const summary = summarizeAttendanceHistory(
      withBoundaryEvents(
        events,
        this.repository.findLastBefore(userId, from),
        this.repository.findFirstAtOrAfter(userId, toExclusive),
      ),
    );
    const daysByDate = new Map<string, MonthlyHistoryDay>();

    for (const event of events) {
      const date = toJapanDate(event.authenticatedAt);
      const day = daysByDate.get(date) ?? {
        date,
        eventCount: 0,
        hasMissingCheckIn: false,
        hasMissingCheckOut: false,
        stayDurationMinutes: 0,
      };
      const pairingStatus = summary.pairingStatusByEventId.get(event.eventId);
      day.eventCount += 1;
      day.hasMissingCheckIn ||= pairingStatus === "missing_check_in";
      day.hasMissingCheckOut ||= pairingStatus === "missing_check_out";
      daysByDate.set(date, day);
    }

    for (const day of daysByDate.values()) {
      day.stayDurationMinutes = Math.floor(
        (summary.stayDurationMsByCheckInDate.get(day.date) ?? 0) / 60_000,
      );
    }

    return {
      month,
      timeZone: historyTimeZone,
      days: [...daysByDate.values()],
    };
  }
}
