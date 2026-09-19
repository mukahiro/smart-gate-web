export type AttendanceSession = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  createdByUserId: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuditInput = {
  auditId: string;
  actorUserId: string;
  occurredAt: string;
};

export type AttendanceSessionMutationResult =
  | { kind: "success"; session: AttendanceSession; changed: boolean }
  | { kind: "not_found" }
  | { kind: "conflict" };

export interface AttendanceSessionRepository {
  list(): AttendanceSession[];
  findById(id: string): AttendanceSession | null;
  create(
    input: AuditInput & {
      sessionId: string;
      title: string;
      startsAt: string;
      endsAt: string;
    },
  ): AttendanceSession;
  update(
    input: AuditInput & {
      sessionId: string;
      expectedUpdatedAt: string;
      values: Partial<Pick<AttendanceSession, "title" | "startsAt" | "endsAt">>;
    },
  ): AttendanceSessionMutationResult;
  cancel(
    input: AuditInput & {
      sessionId: string;
      expectedUpdatedAt: string;
    },
  ): AttendanceSessionMutationResult;
}
