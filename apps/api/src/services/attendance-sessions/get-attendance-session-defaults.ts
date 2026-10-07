import type { AttendancePolicy } from "../../config/attendance-policy";

export class GetAttendanceSessionDefaultsUseCase {
  constructor(private readonly policy: AttendancePolicy) {}

  execute() {
    return {
      receptionOpenMinutesBefore: this.policy.receptionOpenMinutesBefore,
      standardClassDurationMinutes: this.policy.standardClassDurationMinutes,
    };
  }
}
