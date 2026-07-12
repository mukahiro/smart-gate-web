import type {
  AttendanceEventRepository,
  SaveAttendanceEventResult,
} from "../repositories/attendance-event-repository";
import type { AttendanceEventInput } from "../schemas/attendance-event";

export type AttendanceEventResponseBody = {
  eventId: string;
  status: "recorded" | "duplicate";
  resultCode: "RECORDED" | "DUPLICATE_EVENT";
  eventType: AttendanceEventInput["eventType"];
  recordedAt: string;
  receivedAt: string;
  lcdDisplayName: string;
};

export type RecordAttendanceEventResult = {
  status: 201 | 200;
  body: AttendanceEventResponseBody;
};

const toResponse = (
  result: SaveAttendanceEventResult,
): RecordAttendanceEventResult => ({
  status: result.kind === "created" ? 201 : 200,
  body: {
    eventId: result.event.eventId,
    status: result.kind === "created" ? "recorded" : "duplicate",
    resultCode: result.kind === "created" ? "RECORDED" : "DUPLICATE_EVENT",
    eventType: result.event.eventType,
    recordedAt: result.event.authenticatedAt,
    receivedAt: result.event.receivedAt,
    lcdDisplayName: result.event.personId,
  },
});

export const createAttendanceEventService = (
  attendanceEventRepository: AttendanceEventRepository,
) => ({
  record(event: AttendanceEventInput): RecordAttendanceEventResult {
    const receivedAt = new Date().toISOString();
    return toResponse(attendanceEventRepository.save(event, receivedAt));
  },
});
