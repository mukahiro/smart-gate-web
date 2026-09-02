export type {
  DailyHistory,
  DailyHistoryEvent,
  MonthlyHistory,
  MonthlyHistoryDay,
  User,
} from "./types";

import type { DailyHistory, MonthlyHistory, User } from "./types";

type ErrorResponse = { error?: { code?: string; message?: string } };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "サーバーに接続できませんでした");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? "処理に失敗しました",
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const jsonRequest = (
  method: "POST" | "PATCH",
  body?: unknown,
): RequestInit => ({
  method,
  headers:
    body === undefined ? undefined : { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const login = (email: string, password: string) =>
  apiRequest<{ user: User }>(
    "/api/v1/auth/login",
    jsonRequest("POST", { email, password }),
  ).then(({ user }) => user);

export const logout = () =>
  apiRequest<void>("/api/v1/auth/logout", jsonRequest("POST"));

export const getCurrentUser = () =>
  apiRequest<{ user: User }>("/api/v1/auth/me").then(({ user }) => user);

export const getMonthlyHistory = (month: string) =>
  apiRequest<MonthlyHistory>(
    `/api/v1/attendance-events/me/monthly?month=${encodeURIComponent(month)}`,
  );

export const getDailyHistory = (date: string) =>
  apiRequest<DailyHistory>(
    `/api/v1/attendance-events/me/daily?date=${encodeURIComponent(date)}`,
  );

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiRequest<void>(
    "/api/v1/auth/change-password",
    jsonRequest("POST", { currentPassword, newPassword }),
  );
