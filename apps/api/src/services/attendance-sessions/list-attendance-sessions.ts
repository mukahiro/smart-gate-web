import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import { toAttendanceSessionView } from "./session-view";

export class ListAttendanceSessionsUseCase {
  constructor(
    private readonly repository: AttendanceSessionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute() {
    const now = this.now();
    return this.repository
      .list()
      .map((session) => toAttendanceSessionView(session, now));
  }
}
