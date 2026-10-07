import type { UserType } from "../db/user-schema";

export type AuthenticatedUser = {
  id: string;
  studentNumber: string | null;
  name: string;
  lcdDisplayName: string | null;
  email: string;
  userType: UserType;
  isAdmin: boolean;
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
  changePassword(input: {
    userId: string;
    passwordHash: string;
    changedAt: string;
  }): boolean;
}
