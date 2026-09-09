import { apiRequest, jsonRequest } from "../../api/client";
import type { AdminAuditLog, AdminUser } from "./types";

export type CreateAdminUserInput = {
  studentNumber: string;
  name: string;
  lcdDisplayName: string;
  email: string;
};

export type UpdateAdminUserInput = Pick<
  CreateAdminUserInput,
  "name" | "lcdDisplayName" | "email"
>;

export const listAdminUsers = () =>
  apiRequest<{ users: AdminUser[] }>("/api/v1/admin/users").then(
    ({ users }) => users,
  );

export const getAdminUser = (userId: string) =>
  apiRequest<{ user: AdminUser }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}`,
  ).then(({ user }) => user);

export const createAdminUser = (input: CreateAdminUserInput) =>
  apiRequest<{
    user: AdminUser;
    temporaryPassword: string;
    linkedEventCount: number;
  }>("/api/v1/admin/users", jsonRequest("POST", input));

export const updateAdminUser = (userId: string, input: UpdateAdminUserInput) =>
  apiRequest<{ user: AdminUser }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}`,
    jsonRequest("PATCH", input),
  ).then(({ user }) => user);

export const replaceAdminUserFaceImages = (userId: string, images: File[]) => {
  const body = new FormData();
  for (const image of images) body.append("images", image, image.name);
  return apiRequest<{ user: AdminUser }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/face-images`,
    { method: "PUT", body },
  ).then(({ user }) => user);
};

export const setAdminUserActive = (userId: string, isActive: boolean) =>
  apiRequest<{ user: AdminUser }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/${isActive ? "enable" : "disable"}`,
    jsonRequest("POST"),
  ).then(({ user }) => user);

export const unlockAdminUser = (userId: string) =>
  apiRequest<{ user: AdminUser }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/unlock`,
    jsonRequest("POST"),
  ).then(({ user }) => user);

export const revokeAdminUserSessions = (userId: string) =>
  apiRequest<{ revokedSessionCount: number }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
    jsonRequest("POST"),
  );

export const resetAdminUserPassword = (userId: string) =>
  apiRequest<{ temporaryPassword: string }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`,
    jsonRequest("POST"),
  );

export const listAdminAuditLogs = (cursor?: string) => {
  const query = new URLSearchParams({ limit: "50" });
  if (cursor) query.set("cursor", cursor);
  return apiRequest<{ logs: AdminAuditLog[]; nextCursor: string | null }>(
    `/api/v1/admin/audit-logs?${query.toString()}`,
  );
};
