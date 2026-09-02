export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_ORIGIN"
  | "UNAUTHORIZED";

export type AppErrorStatus = 400 | 401 | 403;

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
  abstract readonly status: AppErrorStatus;

  protected constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
