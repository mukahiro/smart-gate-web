import { Hono } from "hono";
import type { FaceAuthClient } from "./clients/face-auth-client";
import type { AttendancePolicy } from "./config/attendance-policy";
import { AppError } from "./errors/app-error";
import type { AdminRepository } from "./repositories/admin-repository";
import type { AttendanceEventRepository } from "./repositories/attendance-event-repository";
import type { AttendanceHistoryRepository } from "./repositories/attendance-history-repository";
import type { AttendanceResultRepository } from "./repositories/attendance-result-repository";
import type { AttendanceSessionRepository } from "./repositories/attendance-session-repository";
import type { AuthRepository } from "./repositories/auth-repository";
import { createAdminRoute } from "./routes/admin";
import { createAttendanceEventsRoute } from "./routes/attendance-events";
import { createAttendanceHistoryRoute } from "./routes/attendance-history";
import { createAttendanceSessionsRoute } from "./routes/attendance-sessions";
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
  adminRepository?: AdminRepository;
  attendanceHistoryRepository?: AttendanceHistoryRepository;
  attendanceSessionRepository?: AttendanceSessionRepository;
  attendanceResultRepository?: AttendanceResultRepository;
  attendancePolicy?: AttendancePolicy;
  secureCookie?: boolean;
  faceAuthClient?: FaceAuthClient;
};

export const createApp = ({
  authToken = process.env.AUTH_APP_BEARER_TOKEN,
  attendanceEventRepository,
  attendanceEventLogger = () => {},
  authRepository,
  adminRepository,
  attendanceHistoryRepository,
  attendanceSessionRepository,
  attendanceResultRepository,
  attendancePolicy,
  secureCookie = process.env.SESSION_COOKIE_SECURE === "true",
  faceAuthClient,
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

  if (authRepository && attendanceHistoryRepository) {
    app.route(
      "/attendance-events/me",
      createAttendanceHistoryRoute({
        authRepository,
        attendanceHistoryRepository,
        secureCookie,
      }),
    );
  }

  if (authRepository && attendanceSessionRepository) {
    app.route(
      "/attendance-sessions",
      createAttendanceSessionsRoute({
        authRepository,
        attendanceSessionRepository,
        attendanceResultRepository,
        attendancePolicy,
        secureCookie,
      }),
    );
  }

  if (authRepository && adminRepository) {
    app.route(
      "/admin",
      createAdminRoute({
        authRepository,
        adminRepository,
        secureCookie,
        faceAuthClient,
      }),
    );
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
    if (error instanceof AppError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            ...(error.details === undefined ? {} : { details: error.details }),
          },
        },
        error.status,
      );
    }

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
