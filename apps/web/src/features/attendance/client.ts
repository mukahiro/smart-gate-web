import { apiRequest, jsonRequest } from "../../api/client";
import type {
  AttendanceAuditLog,
  AttendanceResults,
  AttendanceSession,
} from "./types";

const basePath = "/api/v1/attendance-sessions";

export const listAttendanceSessions = () =>
  apiRequest<{ sessions: AttendanceSession[] }>(basePath).then(
    ({ sessions }) => sessions,
  );

export const getAttendanceSession = (id: string) =>
  apiRequest<{ session: AttendanceSession }>(
    `${basePath}/${encodeURIComponent(id)}`,
  ).then(({ session }) => session);

export const createAttendanceSession = (input: {
  title: string;
  startsAt: string;
  endsAt: string;
}) =>
  apiRequest<{ session: AttendanceSession }>(
    basePath,
    jsonRequest("POST", input),
  ).then(({ session }) => session);

export const updateAttendanceSession = (
  id: string,
  input: {
    title: string;
    startsAt: string;
    endsAt: string;
    expectedUpdatedAt: string;
  },
) =>
  apiRequest<{ session: AttendanceSession }>(
    `${basePath}/${encodeURIComponent(id)}`,
    jsonRequest("PATCH", input),
  ).then(({ session }) => session);

export const cancelAttendanceSession = (
  id: string,
  expectedUpdatedAt: string,
) =>
  apiRequest<{ session: AttendanceSession }>(
    `${basePath}/${encodeURIComponent(id)}/cancel`,
    jsonRequest("POST", { expectedUpdatedAt }),
  ).then(({ session }) => session);

export const getAttendanceResults = (id: string) =>
  apiRequest<AttendanceResults>(
    `${basePath}/${encodeURIComponent(id)}/results`,
  );

export const listAttendanceAuditLogs = (id: string) =>
  apiRequest<{ logs: AttendanceAuditLog[] }>(
    `${basePath}/${encodeURIComponent(id)}/audit-logs`,
  ).then(({ logs }) => logs);
