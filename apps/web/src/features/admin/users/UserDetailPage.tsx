import { X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { getAdminUser, updateAdminUser } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import type { AdminUser } from "../types";
import { isUserLocked } from "./filter-users";
import { formatAdminDateTime, formatStudentNumber } from "./user-format";

type UserDetailPageProps = {
  userId: string;
  onBack: () => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

export function UserDetailPage({
  userId,
  onBack,
  onSessionExpired,
  onPermissionDenied,
}: UserDetailPageProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [name, setName] = useState("");
  const [lcdDisplayName, setLcdDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminUser(userId)
      .then((result) => {
        if (!active) return;
        setUser(result);
        setName(result.name);
        setLcdDisplayName(result.lcdDisplayName ?? "");
        setEmail(result.email);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (
          handleAdminAuthorizationError(
            cause,
            onSessionExpired,
            onPermissionDenied,
          )
        )
          return;
        setError(adminErrorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, [onPermissionDenied, onSessionExpired, userId]);

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await operation();
    } catch (cause) {
      if (
        !handleAdminAuthorizationError(
          cause,
          onSessionExpired,
          onPermissionDenied,
        )
      )
        setError(adminErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    void run(async () => {
      const updated = await updateAdminUser(user.id, {
        name,
        email,
        ...(user.userType === "student" || lcdDisplayName.trim().length > 0
          ? { lcdDisplayName }
          : {}),
      });
      setUser(updated);
      setName(updated.name);
      setLcdDisplayName(updated.lcdDisplayName ?? "");
      setEmail(updated.email);
      setSuccess("基本情報を更新しました。");
    });
  };

  if (!user) {
    return (
      <div className="dialog-backdrop" role="presentation">
        <dialog open className="dialog-card user-detail-dialog">
          {error ? (
            <div className="notice error-notice" role="alert">
              {error}
            </div>
          ) : (
            <div className="admin-loading">利用者を読み込んでいます…</div>
          )}
        </dialog>
      </div>
    );
  }

  const locked = isUserLocked(user);

  return (
    <div className="dialog-backdrop" role="presentation">
      <dialog
        open
        className="dialog-card user-detail-dialog"
        aria-labelledby="user-detail-title"
        aria-modal="true"
      >
        <section className="admin-card admin-detail-card">
          <header className="admin-page-heading detail-title-row card-header">
            <div>
              <h1 id="user-detail-title">{user.name}</h1>
              <div className="title-badges">
                <span className="role-badge">
                  {user.userType === "teacher" ? "先生" : "生徒"}
                </span>
                {user.isAdmin && (
                  <span className="role-badge" data-role="admin">
                    管理者
                  </span>
                )}
                <span
                  className="status-badge"
                  data-state={user.isActive ? "active" : "inactive"}
                >
                  {user.isActive ? "有効" : "無効"}
                </span>
                {locked && (
                  <span className="status-badge" data-state="locked">
                    ロック中
                  </span>
                )}
              </div>
            </div>
            <button
              className="icon-button close-button"
              type="button"
              onClick={onBack}
              aria-label="利用者詳細を閉じる"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          {error && (
            <div className="notice error-notice" role="alert">
              {error}
            </div>
          )}
          {success && (
            <output className="notice success-notice">{success}</output>
          )}

          <div className="admin-detail-grid">
            <form className="admin-form detail-form" onSubmit={save}>
              <h2>基本情報</h2>
              <label>
                学籍番号
                <input
                  readOnly
                  value={formatStudentNumber(user.studentNumber)}
                />
                <small>学籍番号は管理者画面から変更できません</small>
              </label>
              <label>
                利用者種別
                <input
                  readOnly
                  value={user.userType === "teacher" ? "先生" : "生徒"}
                />
                <small>利用者種別は作成後に変更できません</small>
              </label>
              <label>
                管理者権限
                <input readOnly value={user.isAdmin ? "あり" : "なし"} />
                <small>管理者権限の変更は保守者向けCLIで行います</small>
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
                  required={user.userType === "student"}
                  maxLength={20}
                  value={lcdDisplayName}
                  onChange={(event) => setLcdDisplayName(event.target.value)}
                />
                {user.userType === "teacher" && (
                  <small>認証端末を利用しない場合は空欄にできます</small>
                )}
              </label>
              <label>
                メールアドレス
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <div className="metadata-row">
                <span>作成日時</span>
                <time dateTime={user.createdAt}>
                  {formatAdminDateTime(user.createdAt)}
                </time>
              </div>
              <div className="metadata-row">
                <span>更新日時</span>
                <time dateTime={user.updatedAt}>
                  {formatAdminDateTime(user.updatedAt)}
                </time>
              </div>
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
                  disabled={busy}
                >
                  基本情報を保存
                </button>
              </div>
            </form>
          </div>
        </section>
      </dialog>
    </div>
  );
}
