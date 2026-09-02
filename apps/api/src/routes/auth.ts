import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { requireSameOrigin } from "../middleware/same-origin";
import {
  type AuthEnv,
  createSessionAuthMiddleware,
  sessionCookieName,
} from "../middleware/session-auth";
import type { AuthRepository } from "../repositories/auth-repository";
import { loginInputSchema } from "../schemas/auth";
import { createAuthService } from "../services/auth-service";

type AuthRouteOptions = {
  authRepository: AuthRepository;
  secureCookie: boolean;
};

export const createAuthRoute = ({
  authRepository,
  secureCookie,
}: AuthRouteOptions) => {
  const route = new Hono<AuthEnv>();
  const authService = createAuthService(authRepository);
  authService.deleteExpiredSessions();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: secureCookie,
    path: "/api/v1",
    maxAge: 12 * 60 * 60,
  };

  route.post("/login", requireSameOrigin, async (c) => {
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

    const parsed = loginInputSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "入力内容に誤りがあります",
            details: parsed.error.flatten(),
          },
        },
        400,
      );
    }

    const result = await authService.login(
      parsed.data.email,
      parsed.data.password,
    );
    if (result.kind === "invalid") {
      return c.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "メールアドレスまたはパスワードが正しくありません",
          },
        },
        401,
      );
    }

    setCookie(c, sessionCookieName, result.token, cookieOptions);
    return c.json({ user: result.user }, 200);
  });

  route.post("/logout", requireSameOrigin, (c) => {
    const token = getCookie(c, sessionCookieName);
    if (token) {
      authService.logout(token);
    }
    deleteCookie(c, sessionCookieName, {
      path: cookieOptions.path,
      secure: cookieOptions.secure,
    });
    return c.body(null, 204);
  });

  route.get(
    "/me",
    createSessionAuthMiddleware(authService, secureCookie),
    (c) => c.json({ user: c.get("authenticatedUser") }, 200),
  );

  return route;
};
