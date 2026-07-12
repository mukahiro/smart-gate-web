import { Hono } from "hono";
import type { AttendanceEventRepository } from "./repositories/attendance-event-repository";
import { createAttendanceEventsRoute } from "./routes/attendance-events";

type AppOptions = {
  authToken?: string;
  attendanceEventRepository: AttendanceEventRepository;
};

export const createApp = ({
  authToken = process.env.AUTH_APP_BEARER_TOKEN,
  attendanceEventRepository,
}: AppOptions) => {
  const app = new Hono().basePath("/api/v1");

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "smart-gate-api",
    }),
  );

  app.route(
    "/attendance-events",
    createAttendanceEventsRoute({ authToken, attendanceEventRepository }),
  );

  return app;
};
