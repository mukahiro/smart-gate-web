import { AppError } from "./app-error";

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly status = 400;

  constructor(details: unknown = {}) {
    super("入力内容に誤りがあります", details);
  }
}
