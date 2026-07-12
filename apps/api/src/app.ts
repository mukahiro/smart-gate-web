import { Hono } from "hono";
import { validator } from "hono/validator";
import { attendanceEventInputSchema } from "./schemas/attendance-event";

export const app = new Hono().basePath("/api/v1");

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "smart-gate-api",
  }),
);

app.post(
  "/attendance-events",
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
    const event = c.req.valid("json");

    return c.json(
      {
        eventId: event.eventId,
        status: "accepted",
      },
      202,
    );
  },
);
