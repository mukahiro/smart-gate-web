import { describe, expect, it } from "vitest";
import { readAttendancePolicy } from "../src/config/attendance-policy";

describe("readAttendancePolicy", () => {
  it("uses the university policy as its defaults", () => {
    expect(readAttendancePolicy({})).toEqual({
      receptionOpenMinutesBefore: 10,
      lateAfterMinutes: 20,
    });
  });

  it("reads configured non-negative integers", () => {
    expect(
      readAttendancePolicy({
        ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE: "0",
        ATTENDANCE_LATE_AFTER_MINUTES: "30",
      }),
    ).toEqual({
      receptionOpenMinutesBefore: 0,
      lateAfterMinutes: 30,
    });
  });

  it.each([
    ["", "ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE"],
    ["-1", "ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE"],
    ["1.5", "ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE"],
    [" 10", "ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE"],
    ["not-a-number", "ATTENDANCE_LATE_AFTER_MINUTES"],
    ["9007199254740992", "ATTENDANCE_LATE_AFTER_MINUTES"],
  ])("rejects invalid value %j for %s", (value, name) => {
    expect(() =>
      readAttendancePolicy({
        [name]: value,
      }),
    ).toThrow(`${name} must be a non-negative integer`);
  });
});
