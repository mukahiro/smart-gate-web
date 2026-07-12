import type { AttendanceEventInput } from "./schemas/attendance-event";

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

export interface AttendanceEventStore {
  save(
    event: AttendanceEventInput,
    receivedAt: string,
  ): SaveAttendanceEventResult;
}

export const createInMemoryAttendanceEventStore = (): AttendanceEventStore => {
  const eventsById = new Map<string, StoredAttendanceEvent>();

  return {
    save(event, receivedAt) {
      const existingEvent = eventsById.get(event.eventId);

      if (existingEvent) {
        return {
          kind: "duplicate",
          event: existingEvent,
        };
      }

      const storedEvent = {
        ...event,
        receivedAt,
      };

      eventsById.set(event.eventId, storedEvent);

      return {
        kind: "created",
        event: storedEvent,
      };
    },
  };
};
