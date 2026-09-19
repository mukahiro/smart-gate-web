import { AttendanceSessionNotFoundError } from "../../errors/attendance-session-errors";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";

export class ListAttendanceSessionAuditLogsUseCase {
  constructor(private readonly repository: AttendanceSessionRepository) {}

  execute(sessionId: string) {
    if (!this.repository.findById(sessionId)) {
      throw new AttendanceSessionNotFoundError();
    }
    return this.repository.listAuditLogs(sessionId);
  }
}
