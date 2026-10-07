import { AppError } from "./app-error";

export class AttendanceSessionNotFoundError extends AppError {
  readonly code = "ATTENDANCE_SESSION_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super("出席対象が見つかりません");
  }
}

export class AttendanceSessionConflictError extends AppError {
  readonly code = "ATTENDANCE_SESSION_CONFLICT";
  readonly status = 409;

  constructor() {
    super("出席対象が別の利用者によって更新されています");
  }
}
