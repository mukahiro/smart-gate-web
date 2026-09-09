import { describe, expect, it } from "vitest";
import type { AdminUser } from "../src/features/admin/types";
import { filterUsers } from "../src/features/admin/users/filter-users";

const user = (id: string, overrides: Partial<AdminUser> = {}): AdminUser => ({
  id,
  studentNumber: id.padStart(10, "0"),
  name: `利用者${id}`,
  lcdDisplayName: `USER ${id}`,
  email: `${id}@example.com`,
  role: "member",
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
  user("2", { name: "管理者", role: "admin" }),
  user("3", { isActive: false }),
  user("4", { lockedUntil: "2026-09-02T01:00:00.000Z" }),
];

describe("admin user filtering", () => {
  const now = new Date("2026-09-02T00:00:00.000Z");

  it("searches names, student numbers, and email addresses", () => {
    expect(
      filterUsers(
        users,
        { query: "山田", status: "all", role: "all" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["1"]);
    expect(
      filterUsers(
        users,
        { query: "TARO@", status: "all", role: "all" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["1"]);
    expect(
      filterUsers(
        users,
        { query: "0000000002", status: "all", role: "all" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["2"]);
  });

  it("filters status and role on the client", () => {
    expect(
      filterUsers(
        users,
        { query: "", status: "inactive", role: "all" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["3"]);
    expect(
      filterUsers(users, { query: "", status: "locked", role: "all" }, now).map(
        ({ id }) => id,
      ),
    ).toEqual(["4"]);
    expect(
      filterUsers(users, { query: "", status: "all", role: "admin" }, now).map(
        ({ id }) => id,
      ),
    ).toEqual(["2"]);
  });
});
