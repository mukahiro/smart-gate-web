export type AuthenticatedUser = {
  id: string;
  studentNumber: string;
  name: string;
  lcdDisplayName: string;
  email: string;
};

export type UserAuthenticationRecord = AuthenticatedUser & {
  isActive: boolean;
  passwordHash: string;
  failedLoginCount: number;
  lockedUntil: string | null;
};

export type StoredSession = {
  tokenHash: string;
  user: AuthenticatedUser;
  isUserActive: boolean;
  createdAt: string;
  lastSeenAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
};

export type CreateSessionInput = {
  tokenHash: string;
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
};

export interface AuthRepository {
  findUserAuthentication(
    emailNormalized: string,
  ): UserAuthenticationRecord | null;
  recordLoginFailure(
    userId: string,
    now: string,
    lockThreshold: number,
    lockDurationMs: number,
  ): void;
  clearLoginFailures(userId: string, now: string): void;
  createSession(session: CreateSessionInput): void;
  findSession(tokenHash: string): StoredSession | null;
  touchSession(
    tokenHash: string,
    lastSeenAt: string,
    idleExpiresAt: string,
  ): void;
  deleteSession(tokenHash: string): void;
  deleteExpiredSessions(now: string): void;
}
