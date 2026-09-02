import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import type {
  AuthRepository,
  AuthenticatedUser,
} from "../repositories/auth-repository";

// 未登録メールでもArgon2検証を行い、応答時間から登録有無を推測されにくくする。
const dummyPasswordHash =
  "$argon2id$v=19$m=19456,p=1,t=2$wACRsVTnxQBjexXlmK3kZw$wFWyFNWU539XQfOV207ELe8ZPbKvtdQqyXhgDa5xKyU";
const lockThreshold = 5;
const lockDurationMs = 15 * 60 * 1000;
const idleDurationMs = 2 * 60 * 60 * 1000;
const absoluteDurationMs = 12 * 60 * 60 * 1000;
const touchIntervalMs = 5 * 60 * 1000;

// 生のセッショントークンをDBへ残さず、DB流出時の悪用を防ぐ。
export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

type AuthServiceOptions = {
  now?: () => Date;
  createToken?: () => string;
  verifyPassword?: (passwordHash: string, password: string) => Promise<boolean>;
};

export const createAuthService = (
  repository: AuthRepository,
  {
    now = () => new Date(),
    createToken = () => randomBytes(32).toString("base64url"),
    verifyPassword = (passwordHash, password) =>
      argon2.verify(passwordHash, password),
  }: AuthServiceOptions = {},
) => ({
  async login(email: string, password: string) {
    const currentDate = now();
    const currentTime = currentDate.toISOString();
    const record = repository.findUserAuthentication(
      email.trim().toLowerCase(),
    );
    const passwordMatches = await verifyPassword(
      record?.passwordHash ?? dummyPasswordHash,
      password,
    );
    const isLocked = Boolean(
      record?.lockedUntil && record.lockedUntil > currentTime,
    );

    // 利用者の状態を外部から判別できないよう、失敗理由は統一する。
    if (!record || !passwordMatches || !record.isActive || isLocked) {
      if (record?.isActive && !passwordMatches && !isLocked) {
        repository.recordLoginFailure(
          record.id,
          currentTime,
          lockThreshold,
          lockDurationMs,
        );
      }
      return { kind: "invalid" as const };
    }

    repository.clearLoginFailures(record.id, currentTime);
    repository.deleteExpiredSessions(currentTime);
    const token = createToken();
    const absoluteExpiresAt = new Date(
      currentDate.getTime() + absoluteDurationMs,
    ).toISOString();
    const idleExpiresAt = new Date(
      currentDate.getTime() + idleDurationMs,
    ).toISOString();
    repository.createSession({
      tokenHash: hashSessionToken(token),
      userId: record.id,
      createdAt: currentTime,
      lastSeenAt: currentTime,
      idleExpiresAt,
      absoluteExpiresAt,
    });

    const user: AuthenticatedUser = {
      id: record.id,
      studentNumber: record.studentNumber,
      name: record.name,
      lcdDisplayName: record.lcdDisplayName,
      email: record.email,
    };

    return { kind: "success" as const, token, user };
  },
  authenticate(token: string) {
    const tokenHash = hashSessionToken(token);
    const session = repository.findSession(tokenHash);

    if (!session) {
      return null;
    }

    const currentDate = now();
    const currentTime = currentDate.toISOString();
    if (
      !session.isUserActive ||
      session.idleExpiresAt <= currentTime ||
      session.absoluteExpiresAt <= currentTime
    ) {
      repository.deleteSession(tokenHash);
      return null;
    }

    // アイドル期限は延長しつつ、アクセスごとのDB書き込みは避ける。
    if (
      currentDate.getTime() - Date.parse(session.lastSeenAt) >=
      touchIntervalMs
    ) {
      // アイドル期限を更新しても、セッションの絶対期限は越えない。
      const idleExpiresAt = new Date(
        Math.min(
          currentDate.getTime() + idleDurationMs,
          Date.parse(session.absoluteExpiresAt),
        ),
      ).toISOString();
      repository.touchSession(tokenHash, currentTime, idleExpiresAt);
    }

    return session.user;
  },
  logout(token: string) {
    repository.deleteSession(hashSessionToken(token));
  },
  deleteExpiredSessions() {
    repository.deleteExpiredSessions(now().toISOString());
  },
});

export type AuthService = ReturnType<typeof createAuthService>;
