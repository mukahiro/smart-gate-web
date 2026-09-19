import { AttendanceSessionNotFoundError } from "../../errors/attendance-session-errors";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import { toAttendanceSessionView } from "./session-view";

export class GetAttendanceSessionUseCase {
  constructor(
    private readonly repository: AttendanceSessionRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(id: string) {
    const session = this.repository.findById(id);
    if (!session) throw new AttendanceSessionNotFoundError();
    return toAttendanceSessionView(session, this.now());
  }
}
