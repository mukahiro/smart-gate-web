import { AppError } from "./app-error";

export class AdminPermissionRequiredError extends AppError {
  readonly code = "ADMIN_PERMISSION_REQUIRED";
  readonly status = 403;

  constructor() {
    super("管理者権限が必要です");
  }
}

export class UserNotFoundError extends AppError {
  readonly code = "USER_NOT_FOUND";
  readonly status = 404;

  constructor() {
    super("利用者が見つかりません");
  }
}

export class UserEmailAlreadyExistsError extends AppError {
  readonly code = "USER_EMAIL_ALREADY_EXISTS";
  readonly status = 409;

  constructor() {
    super("メールアドレスはすでに使用されています");
  }
}

export class UserStudentNumberAlreadyExistsError extends AppError {
  readonly code = "USER_STUDENT_NUMBER_ALREADY_EXISTS";
  readonly status = 409;

  constructor() {
    super("学籍番号はすでに使用されています");
  }
}

export class LastAdminRequiredError extends AppError {
  readonly code = "LAST_ADMIN_REQUIRED";
  readonly status = 409;

  constructor() {
    super("最後の有効な管理者は無効化できません");
  }
}

export class CannotDisableSelfError extends AppError {
  readonly code = "CANNOT_DISABLE_SELF";
  readonly status = 409;

  constructor() {
    super("自分自身を無効化できません");
  }
}

export class FaceAuthAppUnavailableError extends AppError {
  readonly code = "FACE_AUTH_APP_UNAVAILABLE";
  readonly status = 502;

  constructor() {
    super("顔認証アプリに接続できませんでした");
  }
}

export class FaceAuthAppRejectedError extends AppError {
  readonly code = "FACE_AUTH_APP_REJECTED";
  readonly status = 502;

  constructor() {
    super("顔認証アプリが顔写真の登録を受け付けませんでした");
  }
}
