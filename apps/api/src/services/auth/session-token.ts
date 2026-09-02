import { createHash } from "node:crypto";

// 生のセッショントークンをDBへ残さず、DB流出時の悪用を防ぐ。
export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
