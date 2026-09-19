export type AppScreen =
  | { kind: "history" }
  | { kind: "admin-users" }
  | { kind: "admin-user-new" }
  | { kind: "admin-user-detail"; userId: string }
  | { kind: "admin-audit" }
  | { kind: "attendance-sessions" }
  | { kind: "attendance-session-detail"; sessionId: string };

export const screenFromPath = (
  pathname: string,
  isAdmin: boolean,
  isTeacher = false,
): AppScreen => {
  if (isTeacher && pathname === "/attendance-sessions") {
    return { kind: "attendance-sessions" };
  }
  const attendanceDetail = pathname.match(/^\/attendance-sessions\/([^/]+)$/);
  if (isTeacher && attendanceDetail?.[1]) {
    try {
      return {
        kind: "attendance-session-detail",
        sessionId: decodeURIComponent(attendanceDetail[1]),
      };
    } catch {
      return { kind: "history" };
    }
  }
  if (!isAdmin || !pathname.startsWith("/admin")) return { kind: "history" };
  if (pathname === "/admin/users/new") return { kind: "admin-user-new" };
  if (pathname === "/admin/users") return { kind: "admin-users" };
  if (pathname === "/admin/audit-logs") return { kind: "admin-audit" };
  const detail = pathname.match(/^\/admin\/users\/([^/]+)$/);
  if (detail?.[1]) {
    try {
      return {
        kind: "admin-user-detail",
        userId: decodeURIComponent(detail[1]),
      };
    } catch {
      return { kind: "history" };
    }
  }
  return { kind: "history" };
};

export const pathForScreen = (screen: AppScreen) => {
  switch (screen.kind) {
    case "admin-users":
      return "/admin/users";
    case "admin-user-new":
      return "/admin/users/new";
    case "admin-user-detail":
      return `/admin/users/${encodeURIComponent(screen.userId)}`;
    case "admin-audit":
      return "/admin/audit-logs";
    case "attendance-sessions":
      return "/attendance-sessions";
    case "attendance-session-detail":
      return `/attendance-sessions/${encodeURIComponent(screen.sessionId)}`;
    default:
      return "/";
  }
};
