export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_ORIGIN"
  | "UNAUTHORIZED"
  | "ADMIN_PERMISSION_REQUIRED"
  | "TEACHER_PERMISSION_REQUIRED"
  | "USER_NOT_FOUND"
  | "USER_EMAIL_ALREADY_EXISTS"
  | "USER_STUDENT_NUMBER_ALREADY_EXISTS"
  | "USER_STUDENT_NUMBER_REQUIRED"
  | "LAST_ADMIN_REQUIRED"
  | "CANNOT_DISABLE_SELF"
  | "INVALID_CURRENT_PASSWORD"
  | "PASSWORD_MUST_DIFFER"
  | "FACE_AUTH_APP_UNAVAILABLE"
  | "FACE_AUTH_APP_REJECTED"
  | "ATTENDANCE_SESSION_NOT_FOUND"
  | "ATTENDANCE_SESSION_CONFLICT";

export type AppErrorStatus = 400 | 401 | 403 | 404 | 409 | 502;

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
