import type { AuditAction } from "../db/audit-log-schema";
import type { UserType } from "../db/user-schema";

export type AdminUser = {
  id: string;
  studentNumber: string | null;
  name: string;
  lcdDisplayName: string | null;
  email: string;
  userType: UserType;
  isAdmin: boolean;
  isActive: boolean;
  faceImageCount: number;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: AuditAction;
  targetUserId: string;
  occurredAt: string;
  changedFields: string[];
};

type AuditInput = {
  auditId: string;
  actorUserId: string;
  occurredAt: string;
};

export type CreateAdminUserInput = AuditInput & {
  userId: string;
  userType: UserType;
  studentNumber: string | null;
  name: string;
  lcdDisplayName: string | null;
  email: string;
  emailNormalized: string;
  passwordHash: string;
};

export type UpdateAdminUserInput = AuditInput & {
  targetUserId: string;
  values: Partial<Pick<AdminUser, "name" | "lcdDisplayName" | "email">> & {
    emailNormalized?: string;
  };
};

export type UpdateFaceImageCountInput = AuditInput & {
  targetUserId: string;
  faceImageCount: number;
};

export type AdminMutationResult =
  | { kind: "success"; user: AdminUser; changed: boolean }
  | { kind: "not_found" }
  | { kind: "email_exists" }
  | { kind: "student_number_exists" }
  | { kind: "cannot_disable_self" }
  | { kind: "last_admin" };

export interface AdminRepository {
  listUsers(): AdminUser[];
  findUser(userId: string): AdminUser | null;
  createUser(
    input: CreateAdminUserInput,
  ): AdminMutationResult & { linkedEventCount?: number };
  updateUser(input: UpdateAdminUserInput): AdminMutationResult;
  setUserActive(
    input: AuditInput & { targetUserId: string; isActive: boolean },
  ): AdminMutationResult;
  unlockUser(input: AuditInput & { targetUserId: string }): AdminMutationResult;
  revokeUserSessions(
    input: AuditInput & { targetUserId: string },
  ): AdminMutationResult & { revokedSessionCount?: number };
  resetUserPassword(
    input: AuditInput & { targetUserId: string; passwordHash: string },
  ): AdminMutationResult;
  updateFaceImageCount(input: UpdateFaceImageCountInput): AdminMutationResult;
  listAuditLogs(input: {
    limit: number;
    cursor?: { occurredAt: string; id: string };
  }): { logs: AdminAuditLog[]; hasMore: boolean };
}
