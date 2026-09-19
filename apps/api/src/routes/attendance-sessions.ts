import { Hono } from "hono";
import { ValidationError } from "../errors/request-errors";
import { requireSameOrigin } from "../middleware/same-origin";
import {
  type AuthEnv,
  createSessionAuthMiddleware,
} from "../middleware/session-auth";
import { requireTeacher } from "../middleware/teacher-auth";
import type { AttendanceSessionRepository } from "../repositories/attendance-session-repository";
import type { AuthRepository } from "../repositories/auth-repository";
import {
  cancelAttendanceSessionSchema,
  createAttendanceSessionSchema,
  updateAttendanceSessionSchema,
} from "../schemas/attendance-session";
import { CancelAttendanceSessionUseCase } from "../services/attendance-sessions/cancel-attendance-session";
import { CreateAttendanceSessionUseCase } from "../services/attendance-sessions/create-attendance-session";
import { GetAttendanceSessionUseCase } from "../services/attendance-sessions/get-attendance-session";
import { ListAttendanceSessionsUseCase } from "../services/attendance-sessions/list-attendance-sessions";
import { UpdateAttendanceSessionUseCase } from "../services/attendance-sessions/update-attendance-session";
import { AuthenticateSessionUseCase } from "../services/auth/authenticate-session";

type AttendanceSessionRouteOptions = {
  attendanceSessionRepository: AttendanceSessionRepository;
  authRepository: AuthRepository;
  secureCookie: boolean;
};

export const createAttendanceSessionsRoute = ({
  attendanceSessionRepository,
  authRepository,
  secureCookie,
}: AttendanceSessionRouteOptions) => {
  const route = new Hono<AuthEnv>();
  route.use(
    "*",
    createSessionAuthMiddleware(
      new AuthenticateSessionUseCase(authRepository),
      secureCookie,
    ),
    requireTeacher,
  );

  const listSessions = new ListAttendanceSessionsUseCase(
    attendanceSessionRepository,
  );
  const getSession = new GetAttendanceSessionUseCase(
    attendanceSessionRepository,
  );
  const createSession = new CreateAttendanceSessionUseCase(
    attendanceSessionRepository,
  );
  const updateSession = new UpdateAttendanceSessionUseCase(
    attendanceSessionRepository,
  );
  const cancelSession = new CancelAttendanceSessionUseCase(
    attendanceSessionRepository,
  );

  route.get("/", (c) => c.json({ sessions: listSessions.execute() }, 200));
  route.post("/", requireSameOrigin, async (c) => {
    const input = createAttendanceSessionSchema.safeParse(await readJson(c));
    if (!input.success) throw new ValidationError(input.error.flatten());
    return c.json(
      {
        session: createSession.execute(
          c.get("authenticatedUser").id,
          input.data,
        ),
      },
      201,
    );
  });
  route.get("/:id", (c) =>
    c.json({ session: getSession.execute(c.req.param("id")) }, 200),
  );
  route.patch("/:id", requireSameOrigin, async (c) => {
    const input = updateAttendanceSessionSchema.safeParse(await readJson(c));
    if (!input.success) throw new ValidationError(input.error.flatten());
    return c.json(
      {
        session: updateSession.execute(
          c.get("authenticatedUser").id,
          c.req.param("id"),
          input.data,
        ),
      },
      200,
    );
  });
  route.post("/:id/cancel", requireSameOrigin, async (c) => {
    const input = cancelAttendanceSessionSchema.safeParse(await readJson(c));
    if (!input.success) throw new ValidationError(input.error.flatten());
    return c.json(
      {
        session: cancelSession.execute(
          c.get("authenticatedUser").id,
          c.req.param("id"),
          input.data.expectedUpdatedAt,
        ),
      },
      200,
    );
  });

  return route;
};

const readJson = async (c: { req: { json: () => Promise<unknown> } }) => {
  try {
    return await c.req.json();
  } catch {
    throw new ValidationError();
  }
};
