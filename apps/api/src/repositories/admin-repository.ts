import type { AdminAuditAction } from "../db/admin-audit-log-schema";
import type { UserRole } from "../db/user-schema";

export type AdminUser = {
  id: string;
  studentNumber: string;
  name: string;
  lcdDisplayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: AdminAuditAction;
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
  studentNumber: string;
  name: string;
  lcdDisplayName: string;
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

export type RecordAdminAuditLogInput = AuditInput & {
  action: AdminAuditAction;
  targetUserId: string;
  changedFields: string[];
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
  recordAuditLog(input: RecordAdminAuditLogInput): void;
  listAuditLogs(input: {
    limit: number;
    cursor?: { occurredAt: string; id: string };
  }): { logs: AdminAuditLog[]; hasMore: boolean };
}
