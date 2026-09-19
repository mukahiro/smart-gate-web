import { useEffect, useMemo, useState } from "react";
import { listAdminUsers } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import type { AdminUser } from "../types";
import { AccountActionsDialog } from "./AccountActionsDialog";
import { FaceImageDialog } from "./FaceImageDialog";
import { type UserFilters, filterUsers, isUserLocked } from "./filter-users";
import { formatStudentNumber } from "./user-format";

type UserListPageProps = {
  currentUserId: string;
  onCreate: () => void;
  onSelect: (userId: string) => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
  onSelfSessionsRevoked: () => void;
};

const initialFilters: UserFilters = { query: "", status: "all", admin: "all" };

export function UserListPage({
  currentUserId,
  onCreate,
  onSelect,
  onSessionExpired,
  onPermissionDenied,
  onSelfSessionsRevoked,
}: UserListPageProps) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [faceImageUser, setFaceImageUser] = useState<AdminUser | null>(null);
  const [accountActionUser, setAccountActionUser] = useState<AdminUser | null>(
    null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: 再読込操作でも同じ一覧を取得する。
  useEffect(() => {
    let active = true;
    setError("");
    listAdminUsers()
      .then((result) => {
        if (active) setUsers(result);
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

  const visibleUsers = useMemo(
    () => (users ? filterUsers(users, filters) : []),
    [filters, users],
  );

  return (
    <>
      <section
        className="admin-card admin-users-card"
        aria-labelledby="admin-users-title"
      >
        <header className="admin-page-heading card-header">
          <div>
            <h1 id="admin-users-title">利用者管理</h1>
            <p>
              {users ? `${users.length}人の利用者` : "利用者を読み込んでいます"}
            </p>
          </div>
          <button className="primary-button" type="button" onClick={onCreate}>
            利用者を登録
          </button>
        </header>

        <div className="user-filters" aria-label="利用者の検索と絞り込み">
          <label className="search-field">
            <span>検索</span>
            <input
              type="search"
              placeholder="氏名・学籍番号・メールアドレス"
              value={filters.query}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>状態</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as UserFilters["status"],
                }))
              }
            >
              <option value="all">すべて</option>
              <option value="active">有効</option>
              <option value="inactive">無効</option>
              <option value="locked">ロック中</option>
            </select>
          </label>
          <label>
            <span>管理権限</span>
            <select
              value={filters.admin}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  admin: event.target.value as UserFilters["admin"],
                }))
              }
            >
              <option value="all">すべて</option>
              <option value="non_admin">一般利用者</option>
              <option value="admin">管理者</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="notice error-notice" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              再読み込み
            </button>
          </div>
        )}
        {!users && !error && <div className="admin-loading">読み込み中…</div>}
        {users && (
          <>
            <div className="result-count">{visibleUsers.length}件を表示</div>
            {visibleUsers.length === 0 ? (
              <div className="admin-empty">
                条件に一致する利用者はいません。
              </div>
            ) : (
              <div className="user-table-wrap">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>利用者</th>
                      <th>学籍番号</th>
                      <th>役割</th>
                      <th>顔画像</th>
                      <th>状態</th>
                      <th>詳細</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </td>
                        <td className="numeric-cell">
                          {formatStudentNumber(user.studentNumber)}
                        </td>
                        <td>
                          <span
                            className="role-badge"
                            data-role={user.isAdmin ? "admin" : "member"}
                          >
                            {user.isAdmin ? "管理者" : "一般"}
                          </span>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            data-state={
                              user.faceImageCount > 0
                                ? "registered"
                                : "inactive"
                            }
                          >
                            {user.faceImageCount > 0
                              ? `${user.faceImageCount}枚`
                              : "未登録"}
                          </span>
                        </td>
                        <td>
                          <div className="status-stack">
                            <span
                              className="status-badge"
                              data-state={user.isActive ? "active" : "inactive"}
                            >
                              {user.isActive ? "有効" : "無効"}
                            </span>
                            {isUserLocked(user) && (
                              <span
                                className="status-badge"
                                data-state="locked"
                              >
                                ロック中
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="user-actions-cell">
                          <div className="user-actions">
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => onSelect(user.id)}
                              aria-label={`${user.name}の詳細を表示`}
                            >
                              基本情報
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => setFaceImageUser(user)}
                              aria-label={`${user.name}の顔認証用画像を編集`}
                            >
                              顔登録
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => setAccountActionUser(user)}
                              aria-label={`${user.name}のアカウントを操作`}
                            >
                              操作
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
      {faceImageUser && (
        <FaceImageDialog
          user={faceImageUser}
          onClose={() => setFaceImageUser(null)}
          onUpdated={(updated) => {
            setUsers(
              (current) =>
                current?.map((user) =>
                  user.id === updated.id ? updated : user,
                ) ?? null,
            );
            setFaceImageUser(updated);
          }}
          onSessionExpired={onSessionExpired}
          onPermissionDenied={onPermissionDenied}
        />
      )}
      {accountActionUser && (
        <AccountActionsDialog
          user={accountActionUser}
          currentUserId={currentUserId}
          onClose={() => setAccountActionUser(null)}
          onUpdated={(updated) => {
            setUsers(
              (current) =>
                current?.map((user) =>
                  user.id === updated.id ? updated : user,
                ) ?? null,
            );
            setAccountActionUser(updated);
          }}
          onSessionExpired={onSessionExpired}
          onPermissionDenied={onPermissionDenied}
          onSelfSessionsRevoked={onSelfSessionsRevoked}
        />
      )}
    </>
  );
}
