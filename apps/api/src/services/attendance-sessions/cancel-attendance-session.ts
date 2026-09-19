import { randomUUID } from "node:crypto";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import { resolveAttendanceSessionMutation } from "./resolve-mutation";
import { nextVersionTimestamp, toAttendanceSessionView } from "./session-view";

export class CancelAttendanceSessionUseCase {
  constructor(
    private readonly repository: AttendanceSessionRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  execute(actorUserId: string, sessionId: string, expectedUpdatedAt: string) {
    const now = this.now();
    const occurredAt = nextVersionTimestamp(now, expectedUpdatedAt);
    const result = resolveAttendanceSessionMutation(
      this.repository.cancel({
        auditId: this.createId(),
        actorUserId,
        occurredAt,
        sessionId,
        expectedUpdatedAt,
      }),
    );
    return toAttendanceSessionView(result.session, new Date(occurredAt));
  }
}
