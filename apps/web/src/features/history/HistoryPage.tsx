import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  ScrollText,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  type MonthlyHistory,
  type User,
  getMonthlyHistory,
} from "../../api/client";
import { PasswordPanel } from "../account/PasswordPanel";
import { AuditLogPage } from "../admin/audit/AuditLogPage";
import { type AppScreen, pathForScreen, screenFromPath } from "../admin/routes";
import { CreateUserPage } from "../admin/users/CreateUserPage";
import { UserDetailPage } from "../admin/users/UserDetailPage";
import { UserListPage } from "../admin/users/UserListPage";
import { DailyDetail } from "./DailyDetail";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { currentJapanDate, formatMonth, shiftMonth } from "./calendar";

type HistoryPageProps = {
  user: User;
  onSessionExpired: () => void;
  onPasswordChanged: () => void;
  onSelfSessionsRevoked: () => void;
  onLogout: () => Promise<void>;
};

export function HistoryPage({
  user,
  onSessionExpired,
  onPasswordChanged,
  onSelfSessionsRevoked,
  onLogout,
}: HistoryPageProps) {
  const today = currentJapanDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [history, setHistory] = useState<MonthlyHistory | null>(null);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<AppScreen>(() =>
    screenFromPath(window.location.pathname, user.role === "admin"),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [userListRefreshKey, setUserListRefreshKey] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);

  const navigate = useCallback((nextScreen: AppScreen, replace = false) => {
    const path = pathForScreen(nextScreen);
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const showHistory = useCallback(
    () => navigate({ kind: "history" }),
    [navigate],
  );

  useEffect(() => {
    if (
      user.role !== "admin" &&
      window.location.pathname.startsWith("/admin")
    ) {
      navigate({ kind: "history" }, true);
    }
    const handlePopState = () =>
      setScreen(
        screenFromPath(window.location.pathname, user.role === "admin"),
      );
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate, user.role]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 同じ表示月の再取得にも反応させる。
  useEffect(() => {
    if (screen.kind !== "history") return;
    let active = true;
    setHistory(null);
    setError("");
    getMonthlyHistory(month)
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          onSessionExpired();
          return;
        }
        setError("月別履歴を取得できませんでした。");
      });
    return () => {
      active = false;
    };
  }, [month, onSessionExpired, reloadCount, screen.kind]);

  const moveMonth = (amount: number) => {
    setMonth((current) => shiftMonth(current, amount));
    setSelectedDate(null);
  };

  const closeCreateUserDialog = () => {
    setCreateUserDialogOpen(false);
    if (screen.kind === "admin-user-new") {
      navigate({ kind: "admin-users" }, true);
    }
  };

  return (
    <div className="application">
      <header className="app-header">
        <a
          className="app-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            showHistory();
          }}
        >
          <img
            className="header-logo"
            src="/assets/images/smart-gate-logo.png"
            alt="Smart Gate"
          />
        </a>
        {user.role === "admin" && (
          <nav className="admin-nav" aria-label="管理者メニュー">
            <button
              type="button"
              data-active={screen.kind === "history" || undefined}
              onClick={showHistory}
            >
              <CalendarDays aria-hidden="true" />
              自分の履歴
            </button>
            <button
              type="button"
              data-active={screen.kind.startsWith("admin-user") || undefined}
              onClick={() => navigate({ kind: "admin-users" })}
            >
              <Users aria-hidden="true" />
              利用者管理
            </button>
            <button
              type="button"
              data-active={screen.kind === "admin-audit" || undefined}
              onClick={() => navigate({ kind: "admin-audit" })}
            >
              <ScrollText aria-hidden="true" />
              監査ログ
            </button>
          </nav>
        )}
        <div className="user-menu-wrap">
          <button
            className="user-button"
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1)}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.studentNumber}</small>
            </span>
            <ChevronDown className="menu-chevron" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="user-menu">
              <button
                type="button"
                onClick={() => {
                  setPasswordDialogOpen(true);
                  setMenuOpen(false);
                }}
              >
                <KeyRound aria-hidden="true" />
                パスワード変更
              </button>
              <button type="button" onClick={() => void onLogout()}>
                <LogOut aria-hidden="true" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="content-shell">
        {screen.kind === "admin-users" ||
        screen.kind === "admin-user-new" ||
        screen.kind === "admin-user-detail" ? (
          <UserListPage
            key={userListRefreshKey}
            onCreate={() => setCreateUserDialogOpen(true)}
            onSelect={(userId) =>
              navigate({ kind: "admin-user-detail", userId })
            }
            onSessionExpired={onSessionExpired}
            onPermissionDenied={showHistory}
          />
        ) : screen.kind === "admin-audit" ? (
          <AuditLogPage
            onSessionExpired={onSessionExpired}
            onPermissionDenied={showHistory}
          />
        ) : (
          <>
            <section className="history-card" aria-labelledby="history-title">
              <div className="history-heading">
                <div>
                  <h1 id="history-title">{formatMonth(month)}</h1>
                </div>
                <div className="month-controls" aria-label="表示月の移動">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setMonth(today.slice(0, 7));
                      setSelectedDate(null);
                    }}
                  >
                    今月
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => moveMonth(-1)}
                    aria-label="前月"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => moveMonth(1)}
                    aria-label="翌月"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="calendar-legend">
                <span>
                  <i className="event-dot" />
                  記録あり
                </span>
                <span>
                  <i className="event-dot" data-warning />
                  記録不足あり
                </span>
                <span>
                  <i className="today-symbol" />
                  本日
                </span>
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
              {!history && !error && (
                <div className="calendar-loading">履歴を読み込んでいます…</div>
              )}
              {history && (
                <MonthlyCalendar
                  month={month}
                  days={history.days}
                  today={today}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    if (date.slice(0, 7) !== month) setMonth(date.slice(0, 7));
                    setSelectedDate(date);
                  }}
                />
              )}
            </section>
            {selectedDate && (
              <DailyDetail
                date={selectedDate}
                onSessionExpired={onSessionExpired}
                onClose={() => setSelectedDate(null)}
              />
            )}
          </>
        )}
      </main>
      {passwordDialogOpen && (
        <PasswordPanel
          onCancel={() => setPasswordDialogOpen(false)}
          onSessionExpired={onSessionExpired}
          onChanged={onPasswordChanged}
        />
      )}
      {(createUserDialogOpen || screen.kind === "admin-user-new") && (
        <CreateUserPage
          onBack={closeCreateUserDialog}
          onCreated={() => setUserListRefreshKey((key) => key + 1)}
          onSessionExpired={onSessionExpired}
          onPermissionDenied={showHistory}
        />
      )}
      {screen.kind === "admin-user-detail" && (
        <UserDetailPage
          userId={screen.userId}
          currentUserId={user.id}
          onBack={() => {
            setUserListRefreshKey((key) => key + 1);
            navigate({ kind: "admin-users" }, true);
          }}
          onSessionExpired={onSessionExpired}
          onPermissionDenied={showHistory}
          onSelfSessionsRevoked={onSelfSessionsRevoked}
        />
      )}
    </div>
  );
}
