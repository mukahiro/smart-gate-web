import type { AttendancePolicy } from "../../config/attendance-policy";
import type { UserType } from "../../db/user-schema";
import type { AttendanceResultRepository } from "../../repositories/attendance-result-repository";
import type { AttendanceSessionRepository } from "../../repositories/attendance-session-repository";
import { calculateAttendanceStatus } from "../attendance-sessions/calculate-attendance-status";
import { getJapanMonthRange } from "./japan-date";

export class ListMyAttendanceSessionsUseCase {
  constructor(
    private readonly sessionRepository: AttendanceSessionRepository,
    private readonly resultRepository: AttendanceResultRepository,
    private readonly policy: AttendancePolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  execute(userId: string, userType: UserType, month: string) {
    // 出席対象は全生徒が対象で、先生自身には出席判定を作らない。
    if (userType !== "student") return [];

    const now = this.now();
    const { from, toExclusive } = getJapanMonthRange(month);
    const sessions = this.sessionRepository.list({ from, toExclusive });
    if (sessions.length === 0) return [];

    const receptionOpensAtBySession = new Map(
      sessions.map((session) => [
        session.id,
        new Date(
          Date.parse(session.startsAt) -
            this.policy.receptionOpenMinutesBefore * 60_000,
        ).toISOString(),
      ]),
    );
    const checkIns = this.resultRepository.findStudentCheckIns({
      userId,
      from: [...receptionOpensAtBySession.values()].reduce((earliest, value) =>
        value < earliest ? value : earliest,
      ),
      toExclusive: sessions
        .map((session) => session.endsAt)
        .reduce((latest, value) => (value > latest ? value : latest)),
    });

    return sessions.map((session) => {
      const startsAtMs = Date.parse(session.startsAt);
      const receptionOpensAt = receptionOpensAtBySession.get(session.id);
      if (!receptionOpensAt) {
        throw new Error(`Missing reception opening time: ${session.id}`);
      }
      const lateCutoffAt = new Date(
        startsAtMs + this.policy.lateAfterMinutes * 60_000,
      ).toISOString();
      const firstCheckInAt =
        checkIns.find(
          (checkedInAt) =>
            checkedInAt >= receptionOpensAt && checkedInAt < session.endsAt,
        ) ?? null;

      return {
        id: session.id,
        title: session.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        attendanceStatus: calculateAttendanceStatus({
          now,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          lateCutoffAt,
          firstCheckInAt,
          cancelled: session.cancelledAt !== null,
        }),
        checkedInAt: firstCheckInAt,
      };
    });
  }
}
