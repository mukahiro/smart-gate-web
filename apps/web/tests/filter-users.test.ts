import { describe, expect, it } from "vitest";
import type { AdminUser } from "../src/features/admin/types";
import { filterUsers } from "../src/features/admin/users/filter-users";

const user = (id: string, overrides: Partial<AdminUser> = {}): AdminUser => ({
  id,
  studentNumber: id.padStart(10, "0"),
  name: `利用者${id}`,
  lcdDisplayName: `USER ${id}`,
  email: `${id}@example.com`,
  userType: "student",
  isAdmin: false,
  isActive: true,
  faceImageCount: 0,
  failedLoginCount: 0,
  lockedUntil: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const users = [
  user("1", { name: "山田 太郎", email: "taro@example.com" }),
  user("2", { name: "管理者", isAdmin: true }),
  user("3", { isActive: false }),
  user("4", { lockedUntil: "2026-09-02T01:00:00.000Z" }),
  user("5", { userType: "teacher", studentNumber: null }),
];

describe("admin user filtering", () => {
  const now = new Date("2026-09-02T00:00:00.000Z");

  it("searches names, student numbers, and email addresses", () => {
    expect(
      filterUsers(
        users,
        {
          query: "山田",
          status: "all",
          userType: "all",
          admin: "all",
        },
        now,
      ).map(({ id }) => id),
    ).toEqual(["1"]);
    expect(
      filterUsers(
        users,
        {
          query: "TARO@",
          status: "all",
          userType: "all",
          admin: "all",
        },
        now,
      ).map(({ id }) => id),
    ).toEqual(["1"]);
    expect(
      filterUsers(
        users,
        {
          query: "0000000002",
          status: "all",
          userType: "all",
          admin: "all",
        },
        now,
      ).map(({ id }) => id),
    ).toEqual(["2"]);
  });

  it("filters status and admin permission on the client", () => {
    expect(
      filterUsers(
        users,
        {
          query: "",
          status: "inactive",
          userType: "all",
          admin: "all",
        },
        now,
      ).map(({ id }) => id),
    ).toEqual(["3"]);
    expect(
      filterUsers(
        users,
        {
          query: "",
          status: "locked",
          userType: "all",
          admin: "all",
        },
        now,
      ).map(({ id }) => id),
    ).toEqual(["4"]);
    expect(
      filterUsers(
        users,
        { query: "", status: "all", userType: "all", admin: "admin" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["2"]);
    expect(
      filterUsers(
        users,
        { query: "", status: "all", userType: "teacher", admin: "all" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["5"]);
  });
});
