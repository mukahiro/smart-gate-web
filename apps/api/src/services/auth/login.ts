import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { InvalidCredentialsError } from "../../errors/auth-errors";
import type {
  AuthRepository,
  AuthenticatedUser,
} from "../../repositories/auth-repository";
import { hashSessionToken } from "./session-token";

// 未登録メールでもArgon2検証を行い、応答時間から登録有無を推測されにくくする。
const dummyPasswordHash =
  "$argon2id$v=19$m=19456,p=1,t=2$wACRsVTnxQBjexXlmK3kZw$wFWyFNWU539XQfOV207ELe8ZPbKvtdQqyXhgDa5xKyU";
const lockThreshold = 5;
const lockDurationMs = 15 * 60 * 1000;
const idleDurationMs = 2 * 60 * 60 * 1000;
const absoluteDurationMs = 12 * 60 * 60 * 1000;

type LoginInput = {
  email: string;
  password: string;
};

type LoginOptions = {
  now?: () => Date;
  createToken?: () => string;
  verifyPassword?: (passwordHash: string, password: string) => Promise<boolean>;
};

export class LoginUseCase {
  private readonly now: () => Date;
  private readonly createToken: () => string;
  private readonly verifyPassword: (
    passwordHash: string,
    password: string,
  ) => Promise<boolean>;

  constructor(
    private readonly repository: AuthRepository,
    {
      now = () => new Date(),
      createToken = () => randomBytes(32).toString("base64url"),
      verifyPassword = (passwordHash, password) =>
        argon2.verify(passwordHash, password),
    }: LoginOptions = {},
  ) {
    this.now = now;
    this.createToken = createToken;
    this.verifyPassword = verifyPassword;
  }

  async execute({ email, password }: LoginInput) {
    const currentDate = this.now();
    const currentTime = currentDate.toISOString();
    const record = this.repository.findUserAuthentication(
      email.trim().toLowerCase(),
    );
    const passwordMatches = await this.verifyPassword(
      record?.passwordHash ?? dummyPasswordHash,
      password,
    );
    const isLocked = Boolean(
      record?.lockedUntil && record.lockedUntil > currentTime,
    );

    // 利用者の状態を外部から判別できないよう、失敗理由は統一する。
    if (!record || !passwordMatches || !record.isActive || isLocked) {
      if (record?.isActive && !passwordMatches && !isLocked) {
        this.repository.recordLoginFailure(
          record.id,
          currentTime,
          lockThreshold,
          lockDurationMs,
        );
      }
      throw new InvalidCredentialsError();
    }

    this.repository.clearLoginFailures(record.id, currentTime);
    this.repository.deleteExpiredSessions(currentTime);
    const token = this.createToken();
    const absoluteExpiresAt = new Date(
      currentDate.getTime() + absoluteDurationMs,
    ).toISOString();
    const idleExpiresAt = new Date(
      currentDate.getTime() + idleDurationMs,
    ).toISOString();
    this.repository.createSession({
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

    return { token, user };
  }
}
