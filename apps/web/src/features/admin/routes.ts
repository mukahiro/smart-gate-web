export type AppScreen =
  | { kind: "history" }
  | { kind: "password" }
  | { kind: "admin-users" }
  | { kind: "admin-user-new" }
  | { kind: "admin-user-detail"; userId: string }
  | { kind: "admin-audit" };

export const screenFromPath = (
  pathname: string,
  isAdmin: boolean,
): AppScreen => {
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
    default:
      return "/";
  }
};
