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
import { AuthenticateSessionUseCase } from "../services/auth/authenticate-session";
import { DeleteExpiredSessionsUseCase } from "../services/auth/delete-expired-sessions";
import { LoginUseCase } from "../services/auth/login";
import { LogoutUseCase } from "../services/auth/logout";

type AuthRouteOptions = {
  authRepository: AuthRepository;
  secureCookie: boolean;
};

export const createAuthRoute = ({
  authRepository,
  secureCookie,
}: AuthRouteOptions) => {
  const route = new Hono<AuthEnv>();
  const login = new LoginUseCase(authRepository);
  const authenticateSession = new AuthenticateSessionUseCase(authRepository);
  const logout = new LogoutUseCase(authRepository);
  const deleteExpiredSessions = new DeleteExpiredSessionsUseCase(
    authRepository,
  );
  // 再起動後も残る期限切れセッションを、API起動時にまとめて破棄する。
  deleteExpiredSessions.execute();
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

    const result = await login.execute(parsed.data);
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
      logout.execute(token);
    }
    deleteCookie(c, sessionCookieName, {
      path: cookieOptions.path,
      secure: cookieOptions.secure,
    });
    return c.body(null, 204);
  });

  route.get(
    "/me",
    createSessionAuthMiddleware(authenticateSession, secureCookie),
    (c) => c.json({ user: c.get("authenticatedUser") }, 200),
  );

  return route;
};
