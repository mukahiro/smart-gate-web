import type { AuthRepository } from "../../repositories/auth-repository";
import { hashSessionToken } from "./session-token";

const idleDurationMs = 2 * 60 * 60 * 1000;
const touchIntervalMs = 5 * 60 * 1000;

type AuthenticateSessionOptions = {
  now?: () => Date;
};

export class AuthenticateSessionUseCase {
  private readonly now: () => Date;

  constructor(
    private readonly repository: AuthRepository,
    { now = () => new Date() }: AuthenticateSessionOptions = {},
  ) {
    this.now = now;
  }

  execute(token: string) {
    const tokenHash = hashSessionToken(token);
    const session = this.repository.findSession(tokenHash);

    if (!session) {
      return null;
    }

    const currentDate = this.now();
    const currentTime = currentDate.toISOString();
    if (
      !session.isUserActive ||
      session.idleExpiresAt <= currentTime ||
      session.absoluteExpiresAt <= currentTime
    ) {
      this.repository.deleteSession(tokenHash);
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
      this.repository.touchSession(tokenHash, currentTime, idleExpiresAt);
    }

    return session.user;
  }
}
