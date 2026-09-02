import type { AttendanceEventInput } from "../schemas/attendance-event";

export type StoredAttendanceEvent = AttendanceEventInput & {
  userId: string | null;
  lcdDisplayName: string | null;
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
