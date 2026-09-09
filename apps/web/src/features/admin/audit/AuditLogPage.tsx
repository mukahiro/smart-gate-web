import { useEffect, useMemo, useState } from "react";
import { listAdminAuditLogs, listAdminUsers } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import type { AdminAuditAction, AdminAuditLog, AdminUser } from "../types";
import { formatAdminDateTime, formatStudentNumber } from "../users/user-format";

type AuditLogPageProps = {
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

const actionLabels: Record<AdminAuditAction, string> = {
  user_created: "利用者登録",
  user_updated: "基本情報更新",
  user_enabled: "利用者有効化",
  user_disabled: "利用者無効化",
  user_unlocked: "ロック解除",
  user_sessions_revoked: "全セッション失効",
  user_password_reset: "パスワード再発行",
  user_face_images_updated: "顔画像更新",
};

const fieldLabels: Record<string, string> = {
  name: "氏名",
  lcdDisplayName: "LCD表示名",
  email: "メールアドレス",
  isActive: "有効状態",
  failedLoginCount: "ログイン失敗回数",
  lockedUntil: "ロック期限",
  password: "パスワード",
  sessions: "セッション",
  faceImageCount: "顔認証用画像",
};

const UserReference = ({
  user,
  userId,
}: { user?: AdminUser; userId: string }) => (
  <span className="audit-user">
    <strong>{user?.name ?? "不明な利用者"}</strong>
    <small>{user ? formatStudentNumber(user.studentNumber) : userId}</small>
  </span>
);

export function AuditLogPage({
  onSessionExpired,
  onPermissionDenied,
}: AuditLogPageProps) {
  const [logs, setLogs] = useState<AdminAuditLog[] | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 初回取得に失敗した場合の再試行にも使う。
  useEffect(() => {
    let active = true;
    Promise.all([listAdminAuditLogs(), listAdminUsers()])
      .then(([auditResult, userResult]) => {
        if (!active) return;
        setLogs(auditResult.logs);
        setNextCursor(auditResult.nextCursor);
        setUsers(userResult);
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
  }, [onPermissionDenied, onSessionExpired, reloadCount]);

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError("");
    try {
      const result = await listAdminAuditLogs(nextCursor);
      setLogs((current) => [...(current ?? []), ...result.logs]);
      setNextCursor(result.nextCursor);
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
      setLoadingMore(false);
    }
  };

  return (
    <section className="admin-card audit-card" aria-labelledby="audit-title">
      <header className="admin-page-heading card-header">
        <div>
          <h1 id="audit-title">監査ログ</h1>
          <p>管理者が実行した利用者管理操作を新しい順に表示します。</p>
        </div>
      </header>
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
          {!logs && (
            <button
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              再読み込み
            </button>
          )}
        </div>
      )}
      {!logs && !error && (
        <div className="admin-loading">監査ログを読み込んでいます…</div>
      )}
      {logs?.length === 0 && (
        <div className="admin-empty">監査ログはまだありません。</div>
      )}
      {logs && logs.length > 0 && (
        <div className="audit-list">
          <div className="audit-table-header" aria-hidden="true">
            <span>日時</span>
            <span>操作</span>
            <span>操作した管理者</span>
            <span>対象利用者</span>
            <span>変更項目</span>
          </div>
          {logs.map((log) => (
            <article className="audit-entry" key={log.id}>
              <time dateTime={log.occurredAt}>
                {formatAdminDateTime(log.occurredAt)}
              </time>
              <span className="audit-action">{actionLabels[log.action]}</span>
              <div>
                <UserReference
                  user={usersById.get(log.actorUserId)}
                  userId={log.actorUserId}
                />
              </div>
              <div>
                <UserReference
                  user={usersById.get(log.targetUserId)}
                  userId={log.targetUserId}
                />
              </div>
              <div className="changed-fields">
                <span>
                  {log.changedFields.length > 0
                    ? log.changedFields
                        .map((field) => fieldLabels[field] ?? field)
                        .join("、")
                    : "—"}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
      {nextCursor && (
        <div className="load-more-row">
          <button
            className="secondary-button"
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "読み込み中…" : "さらに読み込む"}
          </button>
        </div>
      )}
    </section>
  );
}
