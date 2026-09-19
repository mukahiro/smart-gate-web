import {
  AttendanceSessionConflictError,
  AttendanceSessionNotFoundError,
} from "../../errors/attendance-session-errors";
import type { AttendanceSessionMutationResult } from "../../repositories/attendance-session-repository";

export const resolveAttendanceSessionMutation = (
  result: AttendanceSessionMutationResult,
) => {
  switch (result.kind) {
    case "success":
      return result;
    case "not_found":
      throw new AttendanceSessionNotFoundError();
    case "conflict":
      throw new AttendanceSessionConflictError();
  }
};
