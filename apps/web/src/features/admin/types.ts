export type AdminUser = {
  id: string;
  studentNumber: string;
  name: string;
  lcdDisplayName: string;
  email: string;
  role: "member" | "admin";
  isActive: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAuditAction =
  | "user_created"
  | "user_updated"
  | "user_enabled"
  | "user_disabled"
  | "user_unlocked"
  | "user_sessions_revoked"
  | "user_password_reset"
  | "user_face_images_updated";

export type AdminAuditLog = {
  id: string;
  actorUserId: string;
  action: AdminAuditAction;
  targetUserId: string;
  occurredAt: string;
  changedFields: string[];
};
