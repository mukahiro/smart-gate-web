import { ArrowLeft } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import {
  getAdminUser,
  resetAdminUserPassword,
  revokeAdminUserSessions,
  setAdminUserActive,
  unlockAdminUser,
  updateAdminUser,
} from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { TemporaryPasswordDialog } from "../shared/TemporaryPasswordDialog";
import type { AdminUser } from "../types";
import { isUserLocked } from "./filter-users";
import { formatAdminDateTime, formatStudentNumber } from "./user-format";

type UserDetailPageProps = {
  userId: string;
  currentUserId: string;
  onBack: () => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
  onSelfSessionsRevoked: () => void;
};

type ConfirmAction = "disable" | "revoke" | "reset";

export function UserDetailPage({
  userId,
  currentUserId,
  onBack,
  onSessionExpired,
  onPermissionDenied,
  onSelfSessionsRevoked,
}: UserDetailPageProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [name, setName] = useState("");
  const [lcdDisplayName, setLcdDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    getAdminUser(userId)
      .then((result) => {
        if (!active) return;
        setUser(result);
        setName(result.name);
        setLcdDisplayName(result.lcdDisplayName);
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
        lcdDisplayName,
        email,
      });
      setUser(updated);
      setName(updated.name);
      setLcdDisplayName(updated.lcdDisplayName);
      setEmail(updated.email);
      setSuccess("基本情報を更新しました。");
    });
  };

  const setActive = (isActive: boolean) => {
    if (!user) return;
    void run(async () => {
      setUser(await setAdminUserActive(user.id, isActive));
      setSuccess(
        isActive ? "利用者を有効化しました。" : "利用者を無効化しました。",
      );
      setConfirmAction(null);
    });
  };

  const unlock = () => {
    if (!user) return;
    void run(async () => {
      setUser(await unlockAdminUser(user.id));
      setSuccess("ログインロックを解除しました。");
    });
  };

  const revokeSessions = () => {
    if (!user) return;
    void run(async () => {
      const result = await revokeAdminUserSessions(user.id);
      setConfirmAction(null);
      if (user.id === currentUserId) {
        onSelfSessionsRevoked();
        return;
      }
      setSuccess(`${result.revokedSessionCount}件のセッションを失効しました。`);
    });
  };

  const resetPassword = () => {
    if (!user) return;
    void run(async () => {
      const result = await resetAdminUserPassword(user.id);
      setConfirmAction(null);
      setTemporaryPassword(result.temporaryPassword);
    });
  };

  if (!user) {
    return (
      <section className="admin-card admin-form-card">
        {error ? (
          <div className="notice error-notice" role="alert">
            {error}
          </div>
        ) : (
          <div className="admin-loading">利用者を読み込んでいます…</div>
        )}
      </section>
    );
  }

  const self = user.id === currentUserId;
  const locked = isUserLocked(user);
  const confirm = confirmAction
    ? {
        disable: {
          title: "利用者を無効化しますか？",
          description: `${user.name}（${formatStudentNumber(user.studentNumber)}）を無効化し、すべてのセッションを失効します。`,
          label: "無効化",
          dangerous: true,
        },
        revoke: {
          title: "すべてのセッションを失効しますか？",
          description: `${user.name}（${formatStudentNumber(user.studentNumber)}）は、ログイン中のすべての端末からログアウトします。`,
          label: "セッションを失効",
          dangerous: true,
        },
        reset: {
          title: "一時パスワードを再発行しますか？",
          description: `${user.name}（${formatStudentNumber(user.studentNumber)}）の現在のパスワードと全セッションが無効になります。`,
          label: "再発行",
          dangerous: true,
        },
      }[confirmAction]
    : null;

  return (
    <>
      <section
        className="admin-card admin-detail-card"
        aria-labelledby="user-detail-title"
      >
        <div className="admin-page-heading detail-title-row">
          <div>
            <h1 id="user-detail-title">{user.name}</h1>
            <div className="title-badges">
              <span className="role-badge" data-role={user.role}>
                {user.role === "admin" ? "管理者" : "一般利用者"}
              </span>
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
        </div>

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
              <input readOnly value={formatStudentNumber(user.studentNumber)} />
              <small>学籍番号は管理者画面から変更できません</small>
            </label>
            <label>
              役割
              <input
                readOnly
                value={user.role === "admin" ? "管理者" : "一般利用者"}
              />
              <small>役割の変更は保守者向けCLIで行います</small>
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
              <button className="secondary-button" type="button" onClick={onBack}>
                キャンセル
              </button>
              <button className="primary-button" type="submit" disabled={busy}>
                基本情報を保存
              </button>
            </div>
          </form>

          <div className="account-actions">
            <h2>アカウント操作</h2>
            <div className="action-row">
              <div>
                <strong>
                  {user.isActive ? "利用者を無効化" : "利用者を有効化"}
                </strong>
                <span>
                  {user.isActive
                    ? "ログインを禁止し、全セッションを失効します。"
                    : "再びログインできる状態にします。"}
                </span>
              </div>
              <button
                className={
                  user.isActive ? "danger-outline-button" : "secondary-button"
                }
                type="button"
                disabled={busy || self}
                title={self ? "自分自身は無効化できません" : undefined}
                onClick={() =>
                  user.isActive ? setConfirmAction("disable") : setActive(true)
                }
              >
                {user.isActive ? "無効化" : "有効化"}
              </button>
            </div>
            <div className="action-row">
              <div>
                <strong>ログインロックを解除</strong>
                <span>失敗回数とロック期限をリセットします。</span>
              </div>
              <button
                className="secondary-button"
                type="button"
                disabled={busy || !locked}
                onClick={unlock}
              >
                ロック解除
              </button>
            </div>
            <div className="action-row">
              <div>
                <strong>全セッションを失効</strong>
                <span>すべての端末からログアウトさせます。</span>
              </div>
              <button
                className="danger-outline-button"
                type="button"
                disabled={busy}
                onClick={() => setConfirmAction("revoke")}
              >
                失効
              </button>
            </div>
            <div className="action-row">
              <div>
                <strong>一時パスワードを再発行</strong>
                <span>現在のパスワードと全セッションが無効になります。</span>
              </div>
              <button
                className="danger-outline-button"
                type="button"
                disabled={busy}
                onClick={() => setConfirmAction("reset")}
              >
                再発行
              </button>
            </div>
          </div>
        </div>
      </section>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.label}
          dangerous={confirm.dangerous}
          busy={busy}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() =>
            confirmAction === "disable"
              ? setActive(false)
              : confirmAction === "revoke"
                ? revokeSessions()
                : resetPassword()
          }
        />
      )}
      {temporaryPassword && (
        <TemporaryPasswordDialog
          password={temporaryPassword}
          title="一時パスワードを再発行しました"
          onClose={() => {
            setTemporaryPassword(null);
            if (self) onSelfSessionsRevoked();
          }}
        />
      )}
    </>
  );
}
