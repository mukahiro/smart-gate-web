import { useEffect, useState } from "react";
import {
  ApiError,
  type MonthlyHistory,
  type User,
  getMonthlyHistory,
} from "../../api/client";
import { PasswordPanel } from "../account/PasswordPanel";
import { DailyDetail } from "./DailyDetail";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { currentJapanDate, formatMonth, shiftMonth } from "./calendar";

type HistoryPageProps = {
  user: User;
  onSessionExpired: () => void;
  onPasswordChanged: () => void;
  onLogout: () => Promise<void>;
};

type View = "history" | "password";

export function HistoryPage({
  user,
  onSessionExpired,
  onPasswordChanged,
  onLogout,
}: HistoryPageProps) {
  const today = currentJapanDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [history, setHistory] = useState<MonthlyHistory | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("history");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 同じ表示月の再取得にも反応させる。
  useEffect(() => {
    if (view !== "history") return;
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
  }, [month, onSessionExpired, reloadCount, view]);

  const moveMonth = (amount: number) => {
    setMonth((current) => shiftMonth(current, amount));
    setSelectedDate(null);
  };

  return (
    <div className="application">
      <header className="app-header">
        <a
          className="app-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            setView("history");
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            SG
          </span>
          <span>
            <strong>Smart Gate</strong>
            <small>入退室履歴</small>
          </span>
        </a>
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
            <span aria-hidden="true">⌄</span>
          </button>
          {menuOpen && (
            <div className="user-menu">
              <button
                type="button"
                onClick={() => {
                  setView("password");
                  setSelectedDate(null);
                  setMenuOpen(false);
                }}
              >
                パスワード変更
              </button>
              <button type="button" onClick={() => void onLogout()}>
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="content-shell">
        {view === "password" ? (
          <PasswordPanel
            onCancel={() => setView("history")}
            onSessionExpired={onSessionExpired}
            onChanged={onPasswordChanged}
          />
        ) : (
          <>
            <section className="history-card" aria-labelledby="history-title">
              <div className="history-heading">
                <div>
                  <p className="section-label">Attendance history</p>
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
                    ‹
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => moveMonth(1)}
                    aria-label="翌月"
                  >
                    ›
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
    </div>
  );
}
