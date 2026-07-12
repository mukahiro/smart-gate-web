import { Hono } from "hono";
import { validator } from "hono/validator";
import { createBearerAuthMiddleware } from "../middleware/bearer-auth";
import type { AttendanceEventRepository } from "../repositories/attendance-event-repository";
import { attendanceEventInputSchema } from "../schemas/attendance-event";
import { createAttendanceEventService } from "../services/attendance-event-service";

type AttendanceEventsRouteOptions = {
  authToken?: string;
  attendanceEventRepository: AttendanceEventRepository;
};

export const createAttendanceEventsRoute = ({
  authToken,
  attendanceEventRepository,
}: AttendanceEventsRouteOptions) => {
  const route = new Hono();
  const attendanceEventService = createAttendanceEventService(
    attendanceEventRepository,
  );

  route.post(
    "/",
    createBearerAuthMiddleware(authToken),
    validator("json", (value, c) => {
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

      return result.data;
    }),
    (c) => {
      const result = attendanceEventService.record(c.req.valid("json"));

      return c.json(result.body, result.status);
    },
  );

  return route;
};
