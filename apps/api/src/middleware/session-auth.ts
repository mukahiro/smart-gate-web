import type { MiddlewareHandler } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { AuthenticationRequiredError } from "../errors/auth-errors";
import type { AuthenticatedUser } from "../repositories/auth-repository";
import type { AuthenticateSessionUseCase } from "../services/auth/authenticate-session";

export const sessionCookieName = "smart_gate_session";

export type AuthEnv = {
  Variables: {
    authenticatedUser: AuthenticatedUser;
  };
};

export const createSessionAuthMiddleware =
  (
    authenticateSession: AuthenticateSessionUseCase,
    secure: boolean,
  ): MiddlewareHandler<AuthEnv> =>
  async (c, next) => {
    const token = getCookie(c, sessionCookieName);
    const user = token ? authenticateSession.execute(token) : null;

    if (!user) {
      deleteCookie(c, sessionCookieName, {
        path: "/api/v1",
        secure,
      });
      throw new AuthenticationRequiredError();
    }

    c.set("authenticatedUser", user);
    await next();
  };
