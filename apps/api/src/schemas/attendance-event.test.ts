import { describe, expect, it } from "vitest";
import { attendanceEventInputSchema } from "./attendance-event";

describe("attendanceEventInputSchema", () => {
  it("accepts a valid attendance event", () => {
    const result = attendanceEventInputSchema.safeParse({
      eventId: "event-001",
      personId: "person-001",
      deviceId: "device-001",
      method: "card",
      eventType: "check_in",
      authenticatedAt: "2026-07-12T08:45:12+09:00",
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid confidence", () => {
    const result = attendanceEventInputSchema.safeParse({
      eventId: "event-001",
      personId: "person-001",
      deviceId: "device-001",
      method: "face",
      eventType: "check_in",
      authenticatedAt: "2026-07-12T08:45:12+09:00",
      confidence: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it("requires confidence for face authentication", () => {
    const result = attendanceEventInputSchema.safeParse({
      eventId: "event-001",
      personId: "person-001",
      deviceId: "device-001",
      method: "face",
      eventType: "check_in",
      authenticatedAt: "2026-07-12T08:45:12+09:00",
    });

    expect(result.success).toBe(false);
  });
});
