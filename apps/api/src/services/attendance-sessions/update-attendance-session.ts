import { randomUUID } from "node:crypto";
import { ValidationError } from "../../errors/request-errors";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import type { UpdateAttendanceSessionInput } from "../../schemas/attendance-session";
import { resolveAttendanceSessionMutation } from "./resolve-mutation";
import { nextVersionTimestamp, toAttendanceSessionView } from "./session-view";

export class UpdateAttendanceSessionUseCase {
  constructor(
    private readonly repository: AttendanceSessionRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  execute(
    actorUserId: string,
    sessionId: string,
    input: UpdateAttendanceSessionInput,
  ) {
    const current = this.repository.findById(sessionId);
    if (!current) {
      return resolveAttendanceSessionMutation({ kind: "not_found" });
    }
    if (current.updatedAt !== input.expectedUpdatedAt) {
      return resolveAttendanceSessionMutation({ kind: "conflict" });
    }
    const startsAt = input.startsAt
      ? new Date(input.startsAt).toISOString()
      : current.startsAt;
    const endsAt = input.endsAt
      ? new Date(input.endsAt).toISOString()
      : current.endsAt;
    if (startsAt >= endsAt) {
      throw new ValidationError({
        fieldErrors: { endsAt: ["終了日時は開始日時より後にしてください"] },
      });
    }
    const now = this.now();
    const occurredAt = nextVersionTimestamp(now, input.expectedUpdatedAt);
    const result = resolveAttendanceSessionMutation(
      this.repository.update({
        auditId: this.createId(),
        actorUserId,
        occurredAt,
        sessionId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        values: {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.startsAt === undefined ? {} : { startsAt }),
          ...(input.endsAt === undefined ? {} : { endsAt }),
        },
      }),
    );
    return toAttendanceSessionView(result.session, new Date(occurredAt));
  }
}
