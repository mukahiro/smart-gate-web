import { randomUUID } from "node:crypto";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import type { CreateAttendanceSessionInput } from "../../schemas/attendance-session";
import { toAttendanceSessionView } from "./session-view";

export class CreateAttendanceSessionUseCase {
  constructor(
    private readonly repository: AttendanceSessionRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  execute(actorUserId: string, input: CreateAttendanceSessionInput) {
    const now = this.now();
    const session = this.repository.create({
      auditId: this.createId(),
      sessionId: this.createId(),
      actorUserId,
      occurredAt: now.toISOString(),
      title: input.title,
      startsAt: new Date(input.startsAt).toISOString(),
      endsAt: new Date(input.endsAt).toISOString(),
    });
    return toAttendanceSessionView(session, now);
  }
}
