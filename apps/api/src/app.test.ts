import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("app", () => {
  it("responds to health checks", async () => {
    const response = await app.request("/api/v1/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("accepts valid attendance events", async () => {
    const response = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventId: "event-001",
        personId: "person-001",
        deviceId: "device-001",
        method: "card",
        eventType: "check_in",
        authenticatedAt: "2026-07-12T08:45:12+09:00",
      }),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      eventId: "event-001",
      status: "accepted",
    });
  });

  it("rejects invalid attendance events", async () => {
    const response = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventId: "",
        method: "unknown",
      }),
    });

    expect(response.status).toBe(400);
  });
});
