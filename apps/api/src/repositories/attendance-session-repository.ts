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

export type AttendanceSessionAuditLog = {
  id: string;
  actorUserId: string;
  action:
    | "attendance_session_created"
    | "attendance_session_updated"
    | "attendance_session_cancelled";
  occurredAt: string;
  changedFields: string[];
  changes: Record<string, { before: unknown; after: unknown }> | null;
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
  list(input: { from: string; toExclusive: string }): AttendanceSession[];
  findById(id: string): AttendanceSession | null;
  listAuditLogs(sessionId: string): AttendanceSessionAuditLog[];
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
