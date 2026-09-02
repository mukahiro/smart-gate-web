import { Hono } from "hono";
import { ValidationError } from "../errors/request-errors";
import { requireAdmin } from "../middleware/admin-auth";
import { requireSameOrigin } from "../middleware/same-origin";
import {
  type AuthEnv,
  createSessionAuthMiddleware,
} from "../middleware/session-auth";
import type { AdminRepository } from "../repositories/admin-repository";
import type { AuthRepository } from "../repositories/auth-repository";
import {
  auditLogQuerySchema,
  createAdminUserSchema,
  updateAdminUserSchema,
} from "../schemas/admin";
import { CreateUserUseCase } from "../services/admin/create-user";
import { GetUserUseCase } from "../services/admin/get-user";
import { ListAuditLogsUseCase } from "../services/admin/list-audit-logs";
import { ListUsersUseCase } from "../services/admin/list-users";
import { ResetUserPasswordUseCase } from "../services/admin/reset-user-password";
import { RevokeUserSessionsUseCase } from "../services/admin/revoke-user-sessions";
import { SetUserActiveUseCase } from "../services/admin/set-user-active";
import { UnlockUserUseCase } from "../services/admin/unlock-user";
import { UpdateUserUseCase } from "../services/admin/update-user";
import { AuthenticateSessionUseCase } from "../services/auth/authenticate-session";

type AdminRouteOptions = {
  adminRepository: AdminRepository;
  authRepository: AuthRepository;
  secureCookie: boolean;
};

export const createAdminRoute = ({
  adminRepository,
  authRepository,
  secureCookie,
}: AdminRouteOptions) => {
  const route = new Hono<AuthEnv>();
  route.use(
    "*",
    createSessionAuthMiddleware(
      new AuthenticateSessionUseCase(authRepository),
      secureCookie,
    ),
    requireAdmin,
  );

  const listUsers = new ListUsersUseCase(adminRepository);
  const getUser = new GetUserUseCase(adminRepository);
  const createUser = new CreateUserUseCase(adminRepository);
  const updateUser = new UpdateUserUseCase(adminRepository);
  const setUserActive = new SetUserActiveUseCase(adminRepository);
  const unlockUser = new UnlockUserUseCase(adminRepository);
  const revokeSessions = new RevokeUserSessionsUseCase(adminRepository);
  const resetPassword = new ResetUserPasswordUseCase(adminRepository);
  const listAuditLogs = new ListAuditLogsUseCase(adminRepository);

  route.get("/users", (c) => c.json({ users: listUsers.execute() }, 200));

  route.post("/users", requireSameOrigin, async (c) => {
    const input = createAdminUserSchema.safeParse(await readJson(c));
    if (!input.success) {
      throw new ValidationError(input.error.flatten());
    }
    const result = await createUser.execute(
      c.get("authenticatedUser").id,
      input.data,
    );
    c.header("Cache-Control", "no-store");
    return c.json(result, 201);
  });

  route.get("/users/:userId", (c) =>
    c.json({ user: getUser.execute(c.req.param("userId")) }, 200),
  );

  route.patch("/users/:userId", requireSameOrigin, async (c) => {
    const input = updateAdminUserSchema.safeParse(await readJson(c));
    if (!input.success) {
      throw new ValidationError(input.error.flatten());
    }
    return c.json(
      {
        user: updateUser.execute(
          c.get("authenticatedUser").id,
          c.req.param("userId"),
          input.data,
        ),
      },
      200,
    );
  });

  route.post("/users/:userId/enable", requireSameOrigin, (c) =>
    c.json(
      {
        user: setUserActive.execute(
          c.get("authenticatedUser").id,
          c.req.param("userId"),
          true,
        ),
      },
      200,
    ),
  );

  route.post("/users/:userId/disable", requireSameOrigin, (c) =>
    c.json(
      {
        user: setUserActive.execute(
          c.get("authenticatedUser").id,
          c.req.param("userId"),
          false,
        ),
      },
      200,
    ),
  );

  route.post("/users/:userId/unlock", requireSameOrigin, (c) =>
    c.json(
      {
        user: unlockUser.execute(
          c.get("authenticatedUser").id,
          c.req.param("userId"),
        ),
      },
      200,
    ),
  );

  route.post("/users/:userId/revoke-sessions", requireSameOrigin, (c) =>
    c.json(
      revokeSessions.execute(
        c.get("authenticatedUser").id,
        c.req.param("userId"),
      ),
      200,
    ),
  );

  route.post("/users/:userId/reset-password", requireSameOrigin, async (c) => {
    const result = await resetPassword.execute(
      c.get("authenticatedUser").id,
      c.req.param("userId"),
    );
    c.header("Cache-Control", "no-store");
    return c.json(result, 200);
  });

  route.get("/audit-logs", (c) => {
    const query = auditLogQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      throw new ValidationError(query.error.flatten());
    }
    try {
      return c.json(listAuditLogs.execute(query.data), 200);
    } catch {
      throw new ValidationError();
    }
  });

  return route;
};

const readJson = async (c: { req: { json: () => Promise<unknown> } }) => {
  try {
    return await c.req.json();
  } catch {
    throw new ValidationError();
  }
};
