import { Hono } from "hono";
import type { AttendanceEventRepository } from "./repositories/attendance-event-repository";
import type { AuthRepository } from "./repositories/auth-repository";
import { createAttendanceEventsRoute } from "./routes/attendance-events";
import { createAuthRoute } from "./routes/auth";
import type { AttendanceEventLogger } from "./services/attendance-events/record-attendance-event";

export const readAuthAppBearerToken = (
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const token = env.AUTH_APP_BEARER_TOKEN;

  if (!token || token.trim().length === 0) {
    throw new Error("AUTH_APP_BEARER_TOKEN is required");
  }

  return token;
};

type AppOptions = {
  authToken?: string;
  attendanceEventRepository: AttendanceEventRepository;
  attendanceEventLogger?: AttendanceEventLogger;
  authRepository?: AuthRepository;
  secureCookie?: boolean;
};

export const createApp = ({
  authToken = process.env.AUTH_APP_BEARER_TOKEN,
  attendanceEventRepository,
  attendanceEventLogger = () => {},
  authRepository,
  secureCookie = process.env.SESSION_COOKIE_SECURE === "true",
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
    createAttendanceEventsRoute({
      authToken,
      attendanceEventRepository,
      attendanceEventLogger,
    }),
  );

  if (authRepository) {
    app.route("/auth", createAuthRoute({ authRepository, secureCookie }));
  }

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "エンドポイントが見つかりません",
        },
      },
      404,
    ),
  );

  app.onError((error, c) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "api_unhandled_error",
        errorName: error.name,
        message: error.message,
      }),
    );

    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "サーバー内部でエラーが発生しました",
        },
      },
      500,
    );
  });

  return app;
};
