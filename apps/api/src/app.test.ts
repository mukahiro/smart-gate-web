import { describe, expect, it } from "vitest";
import { createApp } from "./app";

const app = createApp({ authToken: "test-token" });

const authorizationHeaders = {
  authorization: "Bearer test-token",
};

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
        ...authorizationHeaders,
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

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      eventId: "event-001",
      status: "recorded",
      resultCode: "RECORDED",
      eventType: "check_in",
      recordedAt: "2026-07-12T08:45:12+09:00",
      lcdDisplayName: "person-001",
    });
  });

  it("returns duplicate for a resent event id", async () => {
    const event = {
      eventId: "event-duplicate-001",
      personId: "person-001",
      deviceId: "device-001",
      method: "card",
      eventType: "check_in",
      authenticatedAt: "2026-07-12T08:45:12+09:00",
    };

    const firstResponse = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authorizationHeaders,
      },
      body: JSON.stringify(event),
    });
    const secondResponse = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authorizationHeaders,
      },
      body: JSON.stringify(event),
    });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      eventId: "event-duplicate-001",
      status: "duplicate",
      resultCode: "DUPLICATE_EVENT",
    });
  });

  it("rejects attendance events without bearer auth", async () => {
    const response = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventId: "event-unauthorized-001",
        personId: "person-001",
        deviceId: "device-001",
        method: "card",
        eventType: "check_in",
        authenticatedAt: "2026-07-12T08:45:12+09:00",
      }),
    });

    expect(response.status).toBe(401);
  });

  it("rejects invalid attendance events", async () => {
    const response = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authorizationHeaders,
      },
      body: JSON.stringify({
        eventId: "",
        method: "unknown",
      }),
    });

    expect(response.status).toBe(400);
  });
});
