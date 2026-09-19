export type AttendanceSessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AttendanceSession = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  createdByUserId: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: AttendanceSessionStatus;
};

export type StudentAttendanceStatus =
  | "pending"
  | "unregistered"
  | "present"
  | "late"
  | "absent"
  | "cancelled";

export type AttendanceResults = {
  session: AttendanceSession;
  policy: { receptionOpensAt: string; lateCutoffAt: string };
  summary: {
    targetStudentCount: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    pendingCount: number;
    unregisteredCount: number;
    cancelledCount: number;
  };
  students: Array<{
    userId: string;
    studentNumber: string;
    name: string;
    status: StudentAttendanceStatus;
    checkedInAt: string | null;
  }>;
};

export type AttendanceAuditLog = {
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
