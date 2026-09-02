import { ApiError } from "../../api/client";

export const adminErrorMessage = (cause: unknown) => {
  if (!(cause instanceof ApiError)) return "処理に失敗しました。";
  switch (cause.code) {
    case "USER_EMAIL_ALREADY_EXISTS":
      return "このメールアドレスはすでに登録されています。";
    case "USER_STUDENT_NUMBER_ALREADY_EXISTS":
      return "この学籍番号はすでに登録されています。";
    case "CANNOT_DISABLE_SELF":
      return "自分自身を無効化することはできません。";
    case "LAST_ADMIN_REQUIRED":
      return "最後の有効な管理者を無効化することはできません。";
    case "USER_NOT_FOUND":
      return "対象の利用者が見つかりません。";
    case "VALIDATION_ERROR":
      return "入力内容を確認してください。";
    default:
      return cause.status === 0
        ? "サーバーに接続できませんでした。"
        : "処理に失敗しました。";
  }
};

export const handleAdminAuthorizationError = (
  cause: unknown,
  onSessionExpired: () => void,
  onPermissionDenied: () => void,
) => {
  if (!(cause instanceof ApiError)) return false;
  if (cause.status === 401) {
    onSessionExpired();
    return true;
  }
  if (cause.code === "ADMIN_PERMISSION_REQUIRED" || cause.status === 403) {
    onPermissionDenied();
    return true;
  }
  return false;
};
