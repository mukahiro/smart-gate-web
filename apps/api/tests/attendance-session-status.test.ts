import { describe, expect, it } from "vitest";
import type { AttendanceSession } from "../src/repositories/attendance-session-repository";
import { getAttendanceSessionStatus } from "../src/services/attendance-sessions/session-view";

const session: AttendanceSession = {
  id: "session-001",
  title: "授業",
  startsAt: "2026-10-01T00:00:00.000Z",
  endsAt: "2026-10-01T01:00:00.000Z",
  createdByUserId: "teacher-001",
  cancelledAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("getAttendanceSessionStatus", () => {
  it.each([
    ["2026-09-30T23:59:59.999Z", "scheduled"],
    ["2026-10-01T00:00:00.000Z", "in_progress"],
    ["2026-10-01T00:59:59.999Z", "in_progress"],
    ["2026-10-01T01:00:00.000Z", "completed"],
  ] as const)("returns %s as %s", (now, expected) => {
    expect(getAttendanceSessionStatus(session, new Date(now))).toBe(expected);
  });

  it("prioritizes cancellation over the calculated time status", () => {
    expect(
      getAttendanceSessionStatus(
        { ...session, cancelledAt: "2026-09-01T01:00:00.000Z" },
        new Date("2026-09-01T02:00:00.000Z"),
      ),
    ).toBe("cancelled");
  });
});
