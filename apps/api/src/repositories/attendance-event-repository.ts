import type { AttendanceEventInput } from "../schemas/attendance-event";

export type StoredAttendanceEvent = AttendanceEventInput & {
  receivedAt: string;
};

export type SaveAttendanceEventResult =
  | {
      kind: "created";
      event: StoredAttendanceEvent;
    }
  | {
      kind: "duplicate";
      event: StoredAttendanceEvent;
    };

export interface AttendanceEventRepository {
  save(
    event: AttendanceEventInput,
    receivedAt: string,
  ): SaveAttendanceEventResult;
}
