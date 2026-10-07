import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ApiError } from "../../../api/client";
import { createAdminUser } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import { TemporaryPasswordDialog } from "../shared/TemporaryPasswordDialog";

type CreateUserPageProps = {
  onBack: () => void;
  onCreated: () => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

type CreatedUser = {
  temporaryPassword: string;
  linkedEventCount: number;
  email: string;
  userType: "student" | "teacher";
};

export function CreateUserPage({
  onBack,
  onCreated,
  onSessionExpired,
  onPermissionDenied,
}: CreateUserPageProps) {
  const [userType, setUserType] = useState<"student" | "teacher">("student");
  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");
  const [lcdDisplayName, setLcdDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<
    "studentNumber" | "email" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldError(null);
    setSubmitting(true);
    try {
      const result = await createAdminUser(
        userType === "student"
          ? {
              userType,
              studentNumber: studentNumber.replaceAll("-", ""),
              name,
              lcdDisplayName,
              email,
            }
          : {
              userType,
              studentNumber: studentNumber.replaceAll("-", "").trim() || null,
              name,
              lcdDisplayName: lcdDisplayName.trim() || null,
              email,
            },
      );
      setCreated({
        temporaryPassword: result.temporaryPassword,
        linkedEventCount: result.linkedEventCount,
        email,
        userType,
      });
    } catch (cause) {
      if (
        handleAdminAuthorizationError(
          cause,
          onSessionExpired,
          onPermissionDenied,
        )
      )
        return;
      if (
        cause instanceof ApiError &&
        cause.code === "USER_STUDENT_NUMBER_ALREADY_EXISTS"
      )
        setFieldError("studentNumber");
      if (
        cause instanceof ApiError &&
        cause.code === "USER_EMAIL_ALREADY_EXISTS"
      )
        setFieldError("email");
      setError(adminErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!created && (
        <div className="dialog-backdrop" role="presentation">
          <dialog
            open
            className="dialog-card create-user-dialog"
            aria-labelledby="create-user-title"
            aria-modal="true"
          >
            <header className="dialog-header">
              <h2 id="create-user-title">利用者を登録</h2>
              <button
                className="icon-button close-button"
                type="button"
                onClick={onBack}
                aria-label="利用者登録を閉じる"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <p>生徒または先生のアカウントを作成します。</p>
            <form className="admin-form" onSubmit={submit}>
              <label>
                利用者種別
                <select
                  value={userType}
                  onChange={(event) =>
                    setUserType(event.target.value as "student" | "teacher")
                  }
                >
                  <option value="student">生徒</option>
                  <option value="teacher">先生</option>
                </select>
              </label>
              <label>
                学籍番号
                <input
                  required={userType === "student"}
                  inputMode="numeric"
                  placeholder="12-3456-789-0"
                  value={studentNumber}
                  onChange={(event) => setStudentNumber(event.target.value)}
                  aria-invalid={fieldError === "studentNumber"}
                />
                <small>
                  {userType === "student"
                    ? "必須。ハイフンあり・なしのどちらでも入力できます"
                    : "任意。持っていない場合は空欄にします"}
                </small>
                {fieldError === "studentNumber" && (
                  <span className="field-error">
                    この学籍番号はすでに登録されています。
                  </span>
                )}
              </label>
              <label>
                氏名
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                LCD表示名
                <input
                  required={userType === "student"}
                  maxLength={20}
                  value={lcdDisplayName}
                  onChange={(event) => setLcdDisplayName(event.target.value)}
                />
                <small>
                  {userType === "student"
                    ? "必須。認証端末へ表示する20文字以内の名前"
                    : "任意。認証端末を利用しない場合は空欄にします"}
                </small>
              </label>
              <label>
                メールアドレス
                <input
                  required
                  type="email"
                  maxLength={254}
                  autoComplete="off"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={fieldError === "email"}
                />
                {fieldError === "email" && (
                  <span className="field-error">
                    このメールアドレスはすでに登録されています。
                  </span>
                )}
              </label>
              {error && !fieldError && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onBack}
                >
                  キャンセル
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "登録中…" : "登録して一時パスワードを発行"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
      {created && (
        <TemporaryPasswordDialog
          password={created.temporaryPassword}
          email={created.email}
          note={
            created.userType === "student"
              ? `${
                  created.linkedEventCount > 0
                    ? `未照合の入退室イベントを${created.linkedEventCount}件紐付けました。 `
                    : ""
                }顔認証用画像は利用者詳細から登録してください。`
              : "先生アカウントを作成しました。"
          }
          onClose={() => {
            onCreated();
            onBack();
          }}
        />
      )}
    </>
  );
}
