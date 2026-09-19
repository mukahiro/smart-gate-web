import type { AttendancePolicy } from "../../config/attendance-policy";
import { AttendanceSessionNotFoundError } from "../../errors/attendance-session-errors";
import type { AttendanceResultRepository } from "../../repositories/attendance-result-repository";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import {
  type StudentAttendanceStatus,
  calculateAttendanceStatus,
} from "./calculate-attendance-status";
import { toAttendanceSessionView } from "./session-view";

export class GetAttendanceSessionResultsUseCase {
  constructor(
    private readonly sessionRepository: AttendanceSessionRepository,
    private readonly resultRepository: AttendanceResultRepository,
    private readonly policy: AttendancePolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(sessionId: string) {
    const session = this.sessionRepository.findById(sessionId);
    if (!session) throw new AttendanceSessionNotFoundError();
    const now = this.now();
    const startsAtMs = Date.parse(session.startsAt);
    const receptionOpensAt = new Date(
      startsAtMs - this.policy.receptionOpenMinutesBefore * 60_000,
    ).toISOString();
    const lateCutoffAt = new Date(
      startsAtMs + this.policy.lateAfterMinutes * 60_000,
    ).toISOString();
    const students = this.resultRepository
      .listStudentsWithFirstCheckIn({
        receptionOpensAt,
        endsAt: session.endsAt,
      })
      .map((student) => ({
        userId: student.userId,
        studentNumber: student.studentNumber,
        name: student.name,
        status: calculateAttendanceStatus({
          now,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          lateCutoffAt,
          firstCheckInAt: student.firstCheckInAt,
          cancelled: session.cancelledAt !== null,
        }),
        checkedInAt: student.firstCheckInAt,
      }));
    const count = (status: StudentAttendanceStatus) =>
      students.filter((student) => student.status === status).length;

    return {
      session: toAttendanceSessionView(session, now),
      policy: { receptionOpensAt, lateCutoffAt },
      summary: {
        targetStudentCount: students.length,
        presentCount: count("present"),
        lateCount: count("late"),
        absentCount: count("absent"),
        pendingCount: count("pending"),
        unregisteredCount: count("unregistered"),
        cancelledCount: count("cancelled"),
      },
      students,
    };
  }
}
