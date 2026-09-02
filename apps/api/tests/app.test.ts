import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type {
  AttendanceEventRepository,
  StoredAttendanceEvent,
} from "../src/repositories/attendance-event-repository";
import type { AttendanceEventInput } from "../src/schemas/attendance-event";

const createInMemoryAttendanceEventRepository =
  (): AttendanceEventRepository => {
    const eventsById = new Map<string, StoredAttendanceEvent>();

    return {
      save(event: AttendanceEventInput, receivedAt: string) {
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

const app = createApp({
  authToken: "test-token",
  attendanceEventRepository: createInMemoryAttendanceEventRepository(),
});

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

  it("returns a validation error for malformed JSON", async () => {
    const response = await app.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authorizationHeaders,
      },
      body: "{",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("returns the common error format for unknown endpoints", async () => {
    const response = await app.request("/api/v1/unknown");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "エンドポイントが見つかりません",
      },
    });
  });

  it("returns the common error format for unexpected errors", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failingApp = createApp({
      authToken: "test-token",
      attendanceEventRepository: {
        save() {
          throw new Error("database unavailable");
        },
      },
    });
    const response = await failingApp.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authorizationHeaders,
      },
      body: JSON.stringify({
        eventId: "event-error-001",
        personId: "person-001",
        deviceId: "device-001",
        method: "card",
        eventType: "check_in",
        authenticatedAt: "2026-07-12T08:45:12+09:00",
      }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "サーバー内部でエラーが発生しました",
      },
    });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("logs attendance event results without the person id", async () => {
    const logger = vi.fn();
    const loggingApp = createApp({
      authToken: "test-token",
      attendanceEventRepository: createInMemoryAttendanceEventRepository(),
      attendanceEventLogger: logger,
    });
    const response = await loggingApp.request("/api/v1/attendance-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authorizationHeaders,
      },
      body: JSON.stringify({
        eventId: "event-log-001",
        personId: "person-private-001",
        deviceId: "device-001",
        method: "card",
        eventType: "check_in",
        authenticatedAt: "2026-07-12T08:45:12+09:00",
      }),
    });

    expect(response.status).toBe(201);
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "attendance_event_saved",
        eventId: "event-log-001",
        deviceId: "device-001",
        result: "recorded",
      }),
    );
    expect(logger.mock.calls[0]?.[0]).not.toHaveProperty("personId");
  });
});
