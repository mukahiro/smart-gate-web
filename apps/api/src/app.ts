import { Hono } from "hono";
import {
  type AttendanceEventStore,
  createInMemoryAttendanceEventStore,
} from "./attendance-event-store";
import { createAttendanceEventsRoute } from "./routes/attendance-events";

type AppOptions = {
  authToken?: string;
  attendanceEventStore?: AttendanceEventStore;
};

export const createApp = ({
  authToken = process.env.AUTH_APP_BEARER_TOKEN,
  attendanceEventStore = createInMemoryAttendanceEventStore(),
}: AppOptions = {}) => {
  const app = new Hono().basePath("/api/v1");

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "smart-gate-api",
    }),
  );

  app.route(
    "/attendance-events",
    createAttendanceEventsRoute({ authToken, attendanceEventStore }),
  );

  return app;
};

export const app = createApp();
