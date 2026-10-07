import type { MiddlewareHandler } from "hono";
import { TeacherPermissionRequiredError } from "../errors/admin-errors";
import type { AuthEnv } from "./session-auth";

export const requireTeacher: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (c.get("authenticatedUser").userType !== "teacher") {
    throw new TeacherPermissionRequiredError();
  }

  await next();
};
