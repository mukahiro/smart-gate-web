import { X } from "lucide-react";
import { useState } from "react";
import {
  resetAdminUserPassword,
  revokeAdminUserSessions,
  setAdminUserActive,
  unlockAdminUser,
} from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { TemporaryPasswordDialog } from "../shared/TemporaryPasswordDialog";
import type { AdminUser } from "../types";
import { isUserLocked } from "./filter-users";
import { formatStudentNumber } from "./user-format";

type AccountActionsDialogProps = {
  user: AdminUser;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (user: AdminUser) => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
  onSelfSessionsRevoked: () => void;
};

type ConfirmAction = "disable" | "revoke" | "reset";

export function AccountActionsDialog({
  user: initialUser,
  currentUserId,
  onClose,
  onUpdated,
  onSessionExpired,
  onPermissionDenied,
  onSelfSessionsRevoked,
}: AccountActionsDialogProps) {
  const [user, setUser] = useState(initialUser);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );

  const self = user.id === currentUserId;
  const locked = isUserLocked(user);

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
      ) {
        setError(adminErrorMessage(cause));
      }
    } finally {
      setBusy(false);
    }
  };

  const updateUser = (updated: AdminUser) => {
    setUser(updated);
    onUpdated(updated);
  };

  const setActive = (isActive: boolean) => {
    void run(async () => {
      updateUser(await setAdminUserActive(user.id, isActive));
      setSuccess(
        isActive ? "利用者を有効化しました。" : "利用者を無効化しました。",
      );
      setConfirmAction(null);
    });
  };

  const unlock = () => {
    void run(async () => {
      updateUser(await unlockAdminUser(user.id));
      setSuccess("ログインロックを解除しました。");
    });
  };

  const revokeSessions = () => {
    void run(async () => {
      const result = await revokeAdminUserSessions(user.id);
      setConfirmAction(null);
      if (self) {
        onSelfSessionsRevoked();
        return;
      }
      setSuccess(`${result.revokedSessionCount}件のセッションを失効しました。`);
    });
  };

  const resetPassword = () => {
    void run(async () => {
      const result = await resetAdminUserPassword(user.id);
      setConfirmAction(null);
      setTemporaryPassword(result.temporaryPassword);
    });
  };

  const confirm = confirmAction
    ? {
        disable: {
          title: "利用者を無効化しますか？",
          description: `${user.name}（${formatStudentNumber(user.studentNumber)}）を無効化し、すべてのセッションを失効します。`,
          label: "無効化",
        },
        revoke: {
          title: "すべてのセッションを失効しますか？",
          description: `${user.name}（${formatStudentNumber(user.studentNumber)}）は、ログイン中のすべての端末からログアウトします。`,
          label: "セッションを失効",
        },
        reset: {
          title: "一時パスワードを再発行しますか？",
          description: `${user.name}（${formatStudentNumber(user.studentNumber)}）の現在のパスワードと全セッションが無効になります。`,
          label: "再発行",
        },
      }[confirmAction]
    : null;

  return (
    <>
      <div className="dialog-backdrop" role="presentation">
        <dialog
          open
          className="dialog-card account-actions-dialog"
          aria-labelledby="account-actions-dialog-title"
          aria-modal="true"
        >
          <header className="admin-page-heading detail-title-row card-header">
            <div>
              <h1 id="account-actions-dialog-title">{user.name}</h1>
              <div className="title-badges">
                <span
                  className="role-badge"
                  data-role={user.isAdmin ? "admin" : "member"}
                >
                  {user.isAdmin ? "管理者" : "一般利用者"}
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
            <button
              className="icon-button close-button"
              type="button"
              disabled={busy}
              onClick={onClose}
              aria-label="アカウント操作を閉じる"
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
        </dialog>
      </div>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.label}
          dangerous
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
