import type {
  AttendanceHistoryEvent,
  AttendanceHistoryRepository,
} from "../../repositories/attendance-history-repository";
import { getJapanDayRange, historyTimeZone } from "./japan-date";
import { summarizeAttendanceHistory } from "./summarize-attendance-history";

const withBoundaryEvents = (
  events: AttendanceHistoryEvent[],
  previousEvent: AttendanceHistoryEvent | null,
  nextEvent: AttendanceHistoryEvent | null,
) => [
  ...(previousEvent ? [previousEvent] : []),
  ...events,
  ...(nextEvent ? [nextEvent] : []),
];

export class GetDailyAttendanceHistoryUseCase {
  constructor(private readonly repository: AttendanceHistoryRepository) {}

  execute(userId: string, date: string) {
    const { from, toExclusive } = getJapanDayRange(date);
    const events = this.repository.findInRange(userId, from, toExclusive);
    // 境界外の直近イベントも含め、日をまたぐ入退室を正しく対応付ける。
    const summary = summarizeAttendanceHistory(
      withBoundaryEvents(
        events,
        this.repository.findLastBefore(userId, from),
        this.repository.findFirstAtOrAfter(userId, toExclusive),
      ),
    );
    const responseEvents = events.map((event) => ({
      ...event,
      pairingStatus: summary.pairingStatusByEventId.get(event.eventId),
    }));

    return {
      date,
      timeZone: historyTimeZone,
      events: responseEvents,
      hasMissingCheckIn: responseEvents.some(
        (event) => event.pairingStatus === "missing_check_in",
      ),
      hasMissingCheckOut: responseEvents.some(
        (event) => event.pairingStatus === "missing_check_out",
      ),
      stayDurationMinutes: Math.floor(
        (summary.stayDurationMsByCheckInDate.get(date) ?? 0) / 60_000,
      ),
    };
  }
}
