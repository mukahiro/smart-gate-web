import type {
  AttendanceEventRepository,
  SaveAttendanceEventResult,
} from "../../repositories/attendance-event-repository";
import type { AttendanceEventInput } from "../../schemas/attendance-event";

export type AttendanceEventLogger = (entry: {
  timestamp: string;
  level: "info";
  event: "attendance_event_saved";
  eventId: string;
  deviceId: string;
  method: AttendanceEventInput["method"];
  eventType: AttendanceEventInput["eventType"];
  result: "recorded" | "duplicate";
}) => void;

export type AttendanceEventResponseBody = {
  eventId: string;
  status: "recorded" | "duplicate";
  resultCode: "RECORDED" | "RECORDED_UNMATCHED" | "DUPLICATE_EVENT";
  eventType: AttendanceEventInput["eventType"];
  recordedAt: string;
  receivedAt: string;
  lcdDisplayName: string | null;
};

export type RecordAttendanceEventResult = {
  status: 201 | 200;
  body: AttendanceEventResponseBody;
};

const toResponse = (
  result: SaveAttendanceEventResult,
): RecordAttendanceEventResult => {
  const isDuplicate = result.kind === "duplicate";
  const resultCode = isDuplicate
    ? "DUPLICATE_EVENT"
    : result.event.userId === null
      ? "RECORDED_UNMATCHED"
      : "RECORDED";

  return {
    status: isDuplicate ? 200 : 201,
    body: {
      eventId: result.event.eventId,
      status: isDuplicate ? "duplicate" : "recorded",
      resultCode,
      eventType: result.event.eventType,
      recordedAt: result.event.authenticatedAt,
      receivedAt: result.event.receivedAt,
      lcdDisplayName: result.event.lcdDisplayName,
    },
  };
};

export class RecordAttendanceEventUseCase {
  constructor(
    private readonly attendanceEventRepository: AttendanceEventRepository,
    private readonly logger: AttendanceEventLogger,
  ) {}

  execute(event: AttendanceEventInput): RecordAttendanceEventResult {
    const receivedAt = new Date().toISOString();
    const result = this.attendanceEventRepository.save(event, receivedAt);

    this.logger({
      timestamp: receivedAt,
      level: "info",
      event: "attendance_event_saved",
      eventId: event.eventId,
      deviceId: event.deviceId,
      method: event.method,
      eventType: event.eventType,
      result: result.kind === "created" ? "recorded" : "duplicate",
    });

    return toResponse(result);
  }
}
