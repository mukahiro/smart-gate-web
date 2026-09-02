import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  currentJapanDate,
  formatDuration,
  shiftMonth,
} from "../src/features/history/calendar";

describe("history calendar", () => {
  it("builds six complete Sunday-starting weeks", () => {
    const cells = buildCalendar("2026-07");

    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({
      date: "2026-06-28",
      day: 28,
      inCurrentMonth: false,
    });
    expect(cells.at(-1)).toEqual({
      date: "2026-08-08",
      day: 8,
      inCurrentMonth: false,
    });
    expect(cells.filter((cell) => cell.inCurrentMonth)).toHaveLength(31);
  });

  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("uses Japan time for today's date", () => {
    expect(currentJapanDate(new Date("2026-09-01T14:59:59Z"))).toBe(
      "2026-09-01",
    );
    expect(currentJapanDate(new Date("2026-09-01T15:00:00Z"))).toBe(
      "2026-09-02",
    );
  });

  it("formats reference durations", () => {
    expect(formatDuration(45)).toBe("45分");
    expect(formatDuration(120)).toBe("2時間");
    expect(formatDuration(135)).toBe("2時間15分");
  });
});
