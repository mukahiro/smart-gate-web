import { ArrowLeft } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ApiError } from "../../../api/client";
import { createAdminUser } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import { TemporaryPasswordDialog } from "../shared/TemporaryPasswordDialog";

type CreateUserPageProps = {
  onBack: () => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

type CreatedUser = {
  temporaryPassword: string;
  linkedEventCount: number;
};

export function CreateUserPage({
  onBack,
  onSessionExpired,
  onPermissionDenied,
}: CreateUserPageProps) {
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
      const result = await createAdminUser({
        studentNumber: studentNumber.replaceAll("-", ""),
        name,
        lcdDisplayName,
        email,
      });
      setCreated({
        temporaryPassword: result.temporaryPassword,
        linkedEventCount: result.linkedEventCount,
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
      <section
        className="admin-card admin-form-card"
        aria-labelledby="create-user-title"
      >
        <div className="admin-page-heading">
          <div>
            <h1 id="create-user-title">利用者を登録</h1>
            <p>一般利用者を作成し、一時パスワードを発行します。</p>
          </div>
        </div>
        <form className="admin-form" onSubmit={submit}>
          <label>
            学籍番号
            <input
              required
              inputMode="numeric"
              placeholder="12-3456-789-0"
              value={studentNumber}
              onChange={(event) => setStudentNumber(event.target.value)}
              aria-invalid={fieldError === "studentNumber"}
            />
            <small>ハイフンあり・なしのどちらでも入力できます</small>
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
              required
              maxLength={20}
              value={lcdDisplayName}
              onChange={(event) => setLcdDisplayName(event.target.value)}
            />
            <small>認証端末へ表示する20文字以内の名前</small>
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
            <button className="secondary-button" type="button" onClick={onBack}>
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
      </section>
      {created && (
        <TemporaryPasswordDialog
          password={created.temporaryPassword}
          note={
            created.linkedEventCount > 0
              ? `未照合の入退室イベントを${created.linkedEventCount}件紐付けました。`
              : undefined
          }
          onClose={onBack}
        />
      )}
    </>
  );
}
