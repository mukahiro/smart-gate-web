import { describe, expect, it } from "vitest";
import {
  groupAttendanceSessionsByStartDate,
  japanDateAndTime,
} from "../src/features/attendance/AttendanceSessionCalendar";
import type { AttendanceSession } from "../src/features/attendance/types";

const session = (id: string, startsAt: string): AttendanceSession => ({
  id,
  title: id,
  startsAt,
  endsAt: "2026-10-02T02:00:00.000Z",
  createdByUserId: "teacher-001",
  cancelledAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  status: "scheduled",
});

describe("attendance session calendar", () => {
  it("places sessions on their Japan-time start date", () => {
    expect(japanDateAndTime("2026-10-01T15:30:00.000Z")).toEqual({
      date: "2026-10-02",
      time: "00:30",
    });
  });

  it("groups and orders sessions by their start time", () => {
    const grouped = groupAttendanceSessionsByStartDate([
      session("later", "2026-10-02T03:00:00.000Z"),
      session("next-day", "2026-10-02T15:00:00.000Z"),
      session("earlier", "2026-10-02T00:00:00.000Z"),
    ]);

    expect(grouped.get("2026-10-02")?.map(({ id }) => id)).toEqual([
      "earlier",
      "later",
    ]);
    expect(grouped.get("2026-10-03")?.map(({ id }) => id)).toEqual([
      "next-day",
    ]);
  });
});
