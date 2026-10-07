import { describe, expect, it } from "vitest";
import { pathForScreen, screenFromPath } from "../src/features/admin/routes";

describe("admin screen routes", () => {
  it("resolves admin paths", () => {
    expect(screenFromPath("/admin/users", true)).toEqual({
      kind: "admin-users",
    });
    expect(screenFromPath("/admin/users/new", true)).toEqual({
      kind: "admin-user-new",
    });
    expect(screenFromPath("/admin/users/user%201", true)).toEqual({
      kind: "admin-user-detail",
      userId: "user 1",
    });
    expect(screenFromPath("/admin/audit-logs", true)).toEqual({
      kind: "admin-audit",
    });
  });

  it("keeps members and unknown paths out of admin screens", () => {
    expect(screenFromPath("/admin/users", false)).toEqual({ kind: "history" });
    expect(screenFromPath("/admin/unknown", true)).toEqual({ kind: "history" });
    expect(screenFromPath("/admin/users/%ZZ", true)).toEqual({
      kind: "history",
    });
  });

  it("resolves attendance paths only for teachers", () => {
    expect(screenFromPath("/attendance-sessions", false, true)).toEqual({
      kind: "attendance-sessions",
    });
    expect(
      screenFromPath("/attendance-sessions/session%201", true, true),
    ).toEqual({
      kind: "attendance-session-detail",
      sessionId: "session 1",
    });
    expect(screenFromPath("/attendance-sessions", true, false)).toEqual({
      kind: "history",
    });
  });

  it("builds bookmarkable paths", () => {
    expect(pathForScreen({ kind: "admin-users" })).toBe("/admin/users");
    expect(pathForScreen({ kind: "admin-user-detail", userId: "user 1" })).toBe(
      "/admin/users/user%201",
    );
    expect(
      pathForScreen({
        kind: "attendance-session-detail",
        sessionId: "session 1",
      }),
    ).toBe("/attendance-sessions/session%201");
  });
});
