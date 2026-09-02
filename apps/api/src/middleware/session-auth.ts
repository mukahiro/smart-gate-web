import type { MiddlewareHandler } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import type { AuthenticatedUser } from "../repositories/auth-repository";
import type { AuthService } from "../services/auth-service";

export const sessionCookieName = "smart_gate_session";

export type AuthEnv = {
  Variables: {
    authenticatedUser: AuthenticatedUser;
  };
};

export const createSessionAuthMiddleware =
  (authService: AuthService, secure: boolean): MiddlewareHandler<AuthEnv> =>
  async (c, next) => {
    const token = getCookie(c, sessionCookieName);
    const user = token ? authService.authenticate(token) : null;

    if (!user) {
      deleteCookie(c, sessionCookieName, {
        path: "/api/v1",
        secure,
      });
      return c.json(
        {
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "ログインが必要です",
          },
        },
        401,
      );
    }

    c.set("authenticatedUser", user);
    await next();
  };
