import { useEffect, useMemo, useState } from "react";
import { listAdminUsers } from "../client";
import { adminErrorMessage, handleAdminAuthorizationError } from "../errors";
import type { AdminUser } from "../types";
import { type UserFilters, filterUsers, isUserLocked } from "./filter-users";
import { formatStudentNumber } from "./user-format";

type UserListPageProps = {
  onCreate: () => void;
  onSelect: (userId: string) => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

const initialFilters: UserFilters = { query: "", status: "all", role: "all" };

export function UserListPage({
  onCreate,
  onSelect,
  onSessionExpired,
  onPermissionDenied,
}: UserListPageProps) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

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
          <span>役割</span>
          <select
            value={filters.role}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                role: event.target.value as UserFilters["role"],
              }))
            }
          >
            <option value="all">すべて</option>
            <option value="member">一般利用者</option>
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
            <div className="admin-empty">条件に一致する利用者はいません。</div>
          ) : (
            <div className="user-table-wrap">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>利用者</th>
                    <th>学籍番号</th>
                    <th>役割</th>
                    <th>状態</th>
                    <th>
                      <span className="visually-hidden">詳細</span>
                    </th>
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
                        <span className="role-badge" data-role={user.role}>
                          {user.role === "admin" ? "管理者" : "一般"}
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
                            <span className="status-badge" data-state="locked">
                              ロック中
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => onSelect(user.id)}
                          aria-label={`${user.name}の詳細を表示`}
                        >
                          詳細
                        </button>
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
  );
}
