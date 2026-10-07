import type { MiddlewareHandler } from "hono";
import { AdminPermissionRequiredError } from "../errors/admin-errors";
import type { AuthEnv } from "./session-auth";

export const requireAdmin: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (!c.get("authenticatedUser").isAdmin) {
    throw new AdminPermissionRequiredError();
  }

  await next();
};
