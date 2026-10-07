import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors/app-error";
import { requireAdmin } from "../src/middleware/admin-auth";
import type { AuthEnv } from "../src/middleware/session-auth";
import { requireTeacher } from "../src/middleware/teacher-auth";
import type { AuthenticatedUser } from "../src/repositories/auth-repository";

const createAuthorizationApp = (
  permission: Pick<AuthenticatedUser, "userType" | "isAdmin">,
) => {
  const app = new Hono<AuthEnv>();
  app.use("*", async (c, next) => {
    c.set("authenticatedUser", {
      id: "user-001",
      studentNumber: permission.userType === "student" ? "1234567890" : null,
      name: "利用者",
      lcdDisplayName: "USER",
      email: "user@example.com",
      ...permission,
    });
    await next();
  });
  app.get("/admin", requireAdmin, (c) => c.json({ ok: true }));
  app.get("/teacher", requireTeacher, (c) => c.json({ ok: true }));
  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json({ error: { code: error.code } }, error.status);
    }
    throw error;
  });
  return app;
};

describe("role-independent authorization", () => {
  it.each([
    {
      permission: { userType: "student" as const, isAdmin: false },
      adminStatus: 403,
      teacherStatus: 403,
    },
    {
      permission: { userType: "student" as const, isAdmin: true },
      adminStatus: 200,
      teacherStatus: 403,
    },
    {
      permission: { userType: "teacher" as const, isAdmin: false },
      adminStatus: 403,
      teacherStatus: 200,
    },
    {
      permission: { userType: "teacher" as const, isAdmin: true },
      adminStatus: 200,
      teacherStatus: 200,
    },
  ])(
    "authorizes $permission.userType with admin=$permission.isAdmin independently",
    async ({ permission, adminStatus, teacherStatus }) => {
      const app = createAuthorizationApp(permission);
      expect((await app.request("/admin")).status).toBe(adminStatus);
      expect((await app.request("/teacher")).status).toBe(teacherStatus);
    },
  );
});
