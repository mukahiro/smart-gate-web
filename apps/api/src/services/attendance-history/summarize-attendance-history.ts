import type { AttendanceHistoryEvent } from "../../repositories/attendance-history-repository";
import { toJapanDate } from "./japan-date";

export type PairingStatus = "paired" | "missing_check_in" | "missing_check_out";

export type AttendanceHistorySummary = {
  pairingStatusByEventId: Map<string, PairingStatus>;
  stayDurationMsByCheckInDate: Map<string, number>;
};

export const summarizeAttendanceHistory = (
  events: AttendanceHistoryEvent[],
): AttendanceHistorySummary => {
  const pairingStatusByEventId = new Map<string, PairingStatus>();
  const stayDurationMsByCheckInDate = new Map<string, number>();
  let pendingCheckIn: AttendanceHistoryEvent | null = null;

  for (const event of events) {
    if (event.eventType === "check_in") {
      if (pendingCheckIn) {
        pairingStatusByEventId.set(pendingCheckIn.eventId, "missing_check_out");
      }
      pendingCheckIn = event;
      continue;
    }

    if (!pendingCheckIn) {
      pairingStatusByEventId.set(event.eventId, "missing_check_in");
      continue;
    }

    pairingStatusByEventId.set(pendingCheckIn.eventId, "paired");
    pairingStatusByEventId.set(event.eventId, "paired");
    const checkInDate = toJapanDate(pendingCheckIn.authenticatedAt);
    const duration =
      Date.parse(event.authenticatedAt) -
      Date.parse(pendingCheckIn.authenticatedAt);
    stayDurationMsByCheckInDate.set(
      checkInDate,
      (stayDurationMsByCheckInDate.get(checkInDate) ?? 0) + duration,
    );
    pendingCheckIn = null;
  }

  if (pendingCheckIn) {
    pairingStatusByEventId.set(pendingCheckIn.eventId, "missing_check_out");
  }

  return { pairingStatusByEventId, stayDurationMsByCheckInDate };
};
