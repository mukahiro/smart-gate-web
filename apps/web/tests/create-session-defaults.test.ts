import { describe, expect, it } from "vitest";
import { createSessionDateTimeDefaults } from "../src/features/attendance/create-session-defaults";

describe("createSessionDateTimeDefaults", () => {
  it("starts after the reception lead time and uses the standard duration", () => {
    expect(
      createSessionDateTimeDefaults({
        now: new Date("2026-09-20T01:15:42.000Z"),
        receptionOpenMinutesBefore: 10,
        standardClassDurationMinutes: 90,
      }),
    ).toEqual({
      startDate: "2026-09-20",
      startTime: "10:25",
      endDate: "2026-09-20",
      endTime: "11:55",
    });
  });

  it("uses the selected calendar date and carries the end into the next day", () => {
    expect(
      createSessionDateTimeDefaults({
        now: new Date("2026-09-20T14:45:00.000Z"),
        selectedDate: "2026-10-12",
        receptionOpenMinutesBefore: 10,
        standardClassDurationMinutes: 90,
      }),
    ).toEqual({
      startDate: "2026-10-12",
      startTime: "23:55",
      endDate: "2026-10-13",
      endTime: "01:25",
    });
  });
});
