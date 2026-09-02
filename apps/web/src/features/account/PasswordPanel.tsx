import { type FormEvent, useState } from "react";
import { ApiError, changePassword } from "../../api/client";

type PasswordPanelProps = {
  onCancel: () => void;
  onChanged: () => void;
  onSessionExpired: () => void;
};

export function PasswordPanel({
  onCancel,
  onChanged,
  onSessionExpired,
}: PasswordPanelProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError("新しいパスワードが一致しません。");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      onChanged();
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === "INVALID_CURRENT_PASSWORD"
      ) {
        setError("現在のパスワードが正しくありません。");
      } else if (
        cause instanceof ApiError &&
        cause.code === "PASSWORD_MUST_DIFFER"
      ) {
        setError("現在とは異なるパスワードを入力してください。");
      } else if (
        cause instanceof ApiError &&
        cause.code === "VALIDATION_ERROR"
      ) {
        setError("新しいパスワードは12文字以上128文字以下にしてください。");
      } else if (cause instanceof ApiError && cause.status === 401) {
        onSessionExpired();
      } else {
        setError("パスワードを変更できませんでした。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="account-panel" aria-labelledby="password-title">
      <h2 id="password-title">パスワード変更</h2>
      <p>変更すると、この端末を含むすべての端末からログアウトします。</p>
      <form className="login-form password-form" onSubmit={submit}>
        <label>
          現在のパスワード
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          新しいパスワード
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <small>12文字以上で入力してください</small>
        </label>
        <label>
          新しいパスワード（確認）
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "変更中…" : "パスワードを変更"}
          </button>
        </div>
      </form>
    </section>
  );
}
