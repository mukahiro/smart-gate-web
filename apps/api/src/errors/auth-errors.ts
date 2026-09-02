import { AppError } from "./app-error";

export class InvalidCredentialsError extends AppError {
  readonly code = "INVALID_CREDENTIALS";
  readonly status = 401;

  constructor() {
    super("メールアドレスまたはパスワードが正しくありません");
  }
}

export class AuthenticationRequiredError extends AppError {
  readonly code = "AUTHENTICATION_REQUIRED";
  readonly status = 401;

  constructor() {
    super("ログインが必要です");
  }
}

export class InvalidOriginError extends AppError {
  readonly code = "INVALID_ORIGIN";
  readonly status = 403;

  constructor() {
    super("許可されていないリクエストです");
  }
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly status = 401;

  constructor() {
    super("認証が必要です");
  }
}
