import { Hono } from "hono";
import { ValidationError } from "../errors/request-errors";
import {
  type AuthEnv,
  createSessionAuthMiddleware,
} from "../middleware/session-auth";
import type { AttendanceHistoryRepository } from "../repositories/attendance-history-repository";
import type { AuthRepository } from "../repositories/auth-repository";
import {
  dailyHistoryQuerySchema,
  monthlyHistoryQuerySchema,
} from "../schemas/attendance-history";
import { GetDailyAttendanceHistoryUseCase } from "../services/attendance-history/get-daily-attendance-history";
import { GetMonthlyAttendanceHistoryUseCase } from "../services/attendance-history/get-monthly-attendance-history";
import { AuthenticateSessionUseCase } from "../services/auth/authenticate-session";

type AttendanceHistoryRouteOptions = {
  authRepository: AuthRepository;
  attendanceHistoryRepository: AttendanceHistoryRepository;
  secureCookie: boolean;
};

export const createAttendanceHistoryRoute = ({
  authRepository,
  attendanceHistoryRepository,
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

  route.get("/monthly", sessionAuth, (c) => {
    const parsed = monthlyHistoryQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }

    return c.json(
      getMonthlyHistory.execute(
        c.get("authenticatedUser").id,
        parsed.data.month,
      ),
      200,
    );
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
