import { Hono } from "hono";
import { createBearerAuthMiddleware } from "../middleware/bearer-auth";
import type { AttendanceEventRepository } from "../repositories/attendance-event-repository";
import { attendanceEventInputSchema } from "../schemas/attendance-event";
import {
  type AttendanceEventLogger,
  createAttendanceEventService,
} from "../services/attendance-event-service";

type AttendanceEventsRouteOptions = {
  authToken?: string;
  attendanceEventRepository: AttendanceEventRepository;
  attendanceEventLogger: AttendanceEventLogger;
};

export const createAttendanceEventsRoute = ({
  authToken,
  attendanceEventRepository,
  attendanceEventLogger,
}: AttendanceEventsRouteOptions) => {
  const route = new Hono();
  const attendanceEventService = createAttendanceEventService(
    attendanceEventRepository,
    attendanceEventLogger,
  );

  route.post("/", createBearerAuthMiddleware(authToken), async (c) => {
    let value: unknown;

    try {
      value = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "入力内容に誤りがあります",
            details: {},
          },
        },
        400,
      );
    }

    const result = attendanceEventInputSchema.safeParse(value);

    if (!result.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "入力内容に誤りがあります",
            details: result.error.flatten(),
          },
        },
        400,
      );
    }

    const recordResult = attendanceEventService.record(result.data);

    return c.json(recordResult.body, recordResult.status);
  });

  return route;
};
