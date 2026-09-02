import { Hono } from "hono";
import { ValidationError } from "../errors/request-errors";
import { createBearerAuthMiddleware } from "../middleware/bearer-auth";
import type { AttendanceEventRepository } from "../repositories/attendance-event-repository";
import { attendanceEventInputSchema } from "../schemas/attendance-event";
import {
  type AttendanceEventLogger,
  RecordAttendanceEventUseCase,
} from "../services/attendance-events/record-attendance-event";

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
  const recordAttendanceEvent = new RecordAttendanceEventUseCase(
    attendanceEventRepository,
    attendanceEventLogger,
  );

  route.post("/", createBearerAuthMiddleware(authToken), async (c) => {
    let value: unknown;

    try {
      value = await c.req.json();
    } catch {
      throw new ValidationError();
    }

    const result = attendanceEventInputSchema.safeParse(value);

    if (!result.success) {
      throw new ValidationError(result.error.flatten());
    }

    const recordResult = recordAttendanceEvent.execute(result.data);

    return c.json(recordResult.body, recordResult.status);
  });

  return route;
};
