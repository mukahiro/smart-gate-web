import { Clock3, LogIn, LogOut, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, type DailyHistory, getDailyHistory } from "../../api/client";
import type { MyAttendanceSession, MyAttendanceStatus } from "../../api/types";
import { japanDateAndTime } from "../attendance/AttendanceSessionCalendar";
import { formatDate, formatDuration } from "./calendar";

type DailyDetailProps = {
  date: string;
  attendanceSessions: MyAttendanceSession[];
  onSessionExpired: () => void;
  onClose: () => void;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const attendanceStatusLabels: Record<MyAttendanceStatus, string> = {
  pending: "予定",
  unregistered: "予定",
  present: "出席",
  late: "遅刻",
  absent: "欠席",
  cancelled: "中止",
};

export function DailyDetail({
  date,
  attendanceSessions,
  onSessionExpired,
  onClose,
}: DailyDetailProps) {
  const [history, setHistory] = useState<DailyHistory | null>(null);
  const [error, setError] = useState("");
  const dailyAttendanceSessions = attendanceSessions.filter(
    (session) =>
      session.attendanceStatus !== "cancelled" &&
      japanDateAndTime(session.startsAt).date === date,
  );

  useEffect(() => {
    let active = true;
    setHistory(null);
    setError("");
    getDailyHistory(date)
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          onSessionExpired();
          return;
        }
        setError("日別履歴を取得できませんでした。");
      });
    return () => {
      active = false;
    };
  }, [date, onSessionExpired]);

  return (
    <div className="daily-detail-overlay">
      <button
        className="daily-detail-dismiss"
        type="button"
        onClick={onClose}
        aria-label="日別詳細を閉じる"
      />
      <aside className="detail-panel" aria-labelledby="detail-title">
        <header className="detail-header">
          <div>
            <h2 id="detail-title">{formatDate(date)}</h2>
          </div>
          <button
            className="icon-button close-button"
            type="button"
            onClick={onClose}
            aria-label="日別詳細を閉じる"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {dailyAttendanceSessions.length > 0 && (
          <section
            className="daily-attendance-section"
            aria-labelledby="daily-attendance-title"
          >
            <h3 id="daily-attendance-title">出席情報</h3>
            <div className="daily-attendance-list">
              {dailyAttendanceSessions.map((session) => (
                <article
                  className="daily-attendance-card"
                  data-status={session.attendanceStatus}
                  key={session.id}
                >
                  <header>
                    <strong>{session.title}</strong>
                    <span
                      className="daily-attendance-status"
                      data-status={session.attendanceStatus}
                    >
                      {attendanceStatusLabels[session.attendanceStatus]}
                    </span>
                  </header>
                  <dl>
                    <div>
                      <dt>開始</dt>
                      <dd>
                        <time dateTime={session.startsAt}>
                          {formatDateTime(session.startsAt)}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>終了</dt>
                      <dd>
                        <time dateTime={session.endsAt}>
                          {formatDateTime(session.endsAt)}
                        </time>
                      </dd>
                    </div>
                    {session.checkedInAt && (
                      <div>
                        <dt>
                          <Clock3 aria-hidden="true" />
                          出席時刻
                        </dt>
                        <dd>
                          <time dateTime={session.checkedInAt}>
                            {formatDateTime(session.checkedInAt)}
                          </time>
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="notice error-notice" role="alert">
            {error}
          </div>
        )}
        {!history && !error && (
          <div className="detail-loading">読み込み中…</div>
        )}
        {history && history.events.length === 0 && (
          <div className="empty-detail">
            <strong>記録はありません</strong>
            <span>この日の入退室イベントはありません。</span>
          </div>
        )}
        {history && history.events.length > 0 && (
          <>
            {(history.hasMissingCheckIn || history.hasMissingCheckOut) && (
              <div className="notice warning-notice">
                <strong>記録が不足しています</strong>
                <span>
                  {history.hasMissingCheckIn &&
                    "対応する入室記録がありません。"}
                  {history.hasMissingCheckOut &&
                    "対応する退出記録がありません。"}
                </span>
              </div>
            )}
            <ol className="event-list">
              {history.events.map((event) => (
                <li key={event.eventId}>
                  <span
                    className="event-icon"
                    data-type={event.eventType}
                    aria-hidden="true"
                  >
                    {event.eventType === "check_in" ? (
                      <LogIn aria-hidden="true" />
                    ) : (
                      <LogOut aria-hidden="true" />
                    )}
                  </span>
                  <div className="event-main">
                    <strong>
                      {event.eventType === "check_in" ? "入室" : "退出"}
                    </strong>
                    <span>
                      {event.method === "card" ? "カード認証" : "顔認証"}
                    </span>
                  </div>
                  <time dateTime={event.authenticatedAt}>
                    {formatTime(event.authenticatedAt)}
                  </time>
                  {event.pairingStatus !== "paired" && (
                    <span className="missing-badge">対応記録なし</span>
                  )}
                </li>
              ))}
            </ol>
            <div className="duration-card">
              <span>参考滞在時間</span>
              <strong>{formatDuration(history.stayDurationMinutes)}</strong>
              <small>完成した入退室の組から算出した参考値です</small>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
