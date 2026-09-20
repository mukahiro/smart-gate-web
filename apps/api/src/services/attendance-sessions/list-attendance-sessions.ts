import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import { getJapanMonthRange } from "../attendance-history/japan-date";
import { toAttendanceSessionView } from "./session-view";

export class ListAttendanceSessionsUseCase {
  constructor(
    private readonly repository: AttendanceSessionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(month: string) {
    const now = this.now();
    const range = getJapanMonthRange(month);
    return this.repository
      .list(range)
      .map((session) => toAttendanceSessionView(session, now));
  }
}
