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

export class InvalidCurrentPasswordError extends AppError {
  readonly code = "INVALID_CURRENT_PASSWORD";
  readonly status = 401;

  constructor() {
    super("現在のパスワードが正しくありません");
  }
}

export class PasswordMustDifferError extends AppError {
  readonly code = "PASSWORD_MUST_DIFFER";
  readonly status = 400;

  constructor() {
    super("新しいパスワードには現在と異なる値を指定してください");
  }
}
