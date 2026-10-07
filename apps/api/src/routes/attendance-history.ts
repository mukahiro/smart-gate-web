import { Hono } from "hono";
import type { AttendancePolicy } from "../config/attendance-policy";
import { ValidationError } from "../errors/request-errors";
import {
  type AuthEnv,
  createSessionAuthMiddleware,
} from "../middleware/session-auth";
import type { AttendanceHistoryRepository } from "../repositories/attendance-history-repository";
import type { AttendanceResultRepository } from "../repositories/attendance-result-repository";
import type { AttendanceSessionRepository } from "../repositories/attendance-session-repository";
import type { AuthRepository } from "../repositories/auth-repository";
import {
  dailyHistoryQuerySchema,
  monthlyHistoryQuerySchema,
} from "../schemas/attendance-history";
import { GetDailyAttendanceHistoryUseCase } from "../services/attendance-history/get-daily-attendance-history";
import { GetMonthlyAttendanceHistoryUseCase } from "../services/attendance-history/get-monthly-attendance-history";
import { ListMyAttendanceSessionsUseCase } from "../services/attendance-history/list-my-attendance-sessions";
import { AuthenticateSessionUseCase } from "../services/auth/authenticate-session";

type AttendanceHistoryRouteOptions = {
  authRepository: AuthRepository;
  attendanceHistoryRepository: AttendanceHistoryRepository;
  attendanceSessionRepository?: AttendanceSessionRepository;
  attendanceResultRepository?: AttendanceResultRepository;
  attendancePolicy?: AttendancePolicy;
  secureCookie: boolean;
};

export const createAttendanceHistoryRoute = ({
  authRepository,
  attendanceHistoryRepository,
  attendanceSessionRepository,
  attendanceResultRepository,
  attendancePolicy,
  secureCookie,
}: AttendanceHistoryRouteOptions) => {
  const route = new Hono<AuthEnv>();
  const authenticateSession = new AuthenticateSessionUseCase(authRepository);
  const sessionAuth = createSessionAuthMiddleware(
    authenticateSession,
    secureCookie,
  );
  const getMonthlyHistory = new GetMonthlyAttendanceHistoryUseCase(
    attendanceHistoryRepository,
  );
  const getDailyHistory = new GetDailyAttendanceHistoryUseCase(
    attendanceHistoryRepository,
  );
  const listMyAttendanceSessions =
    attendanceSessionRepository &&
    attendanceResultRepository &&
    attendancePolicy
      ? new ListMyAttendanceSessionsUseCase(
          attendanceSessionRepository,
          attendanceResultRepository,
          attendancePolicy,
        )
      : null;

  route.get("/monthly", sessionAuth, (c) => {
    const parsed = monthlyHistoryQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }

    const user = c.get("authenticatedUser");
    return c.json({
      ...getMonthlyHistory.execute(user.id, parsed.data.month),
      attendanceSessions:
        listMyAttendanceSessions?.execute(user.id, parsed.data.month) ?? [],
    });
  });

  route.get("/daily", sessionAuth, (c) => {
    const parsed = dailyHistoryQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }

    return c.json(
      getDailyHistory.execute(c.get("authenticatedUser").id, parsed.data.date),
      200,
    );
  });

  return route;
};
