import type { AdminUser } from "../types";

export type UserFilters = {
  query: string;
  status: "all" | "active" | "inactive" | "locked";
  userType: "all" | "student" | "teacher";
  admin: "all" | "non_admin" | "admin";
};

export const isUserLocked = (user: AdminUser, now = new Date()) =>
  user.lockedUntil !== null && new Date(user.lockedUntil) > now;

export const filterUsers = (
  users: AdminUser[],
  filters: UserFilters,
  now = new Date(),
) => {
  const query = filters.query.trim().toLocaleLowerCase("ja-JP");
  return users.filter((user) => {
    const matchesQuery =
      query.length === 0 ||
      [user.name, user.studentNumber, user.email].some((value) =>
        value?.toLocaleLowerCase("ja-JP").includes(query),
      );
    const matchesAdmin =
      filters.admin === "all" ||
      (filters.admin === "admin" && user.isAdmin) ||
      (filters.admin === "non_admin" && !user.isAdmin);
    const matchesUserType =
      filters.userType === "all" || user.userType === filters.userType;
    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" && user.isActive) ||
      (filters.status === "inactive" && !user.isActive) ||
      (filters.status === "locked" && isUserLocked(user, now));
    return matchesQuery && matchesUserType && matchesAdmin && matchesStatus;
  });
};
