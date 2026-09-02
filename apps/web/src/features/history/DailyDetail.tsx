import { useEffect, useState } from "react";
import { ApiError, type DailyHistory, getDailyHistory } from "../../api/client";
import { formatDate, formatDuration } from "./calendar";

type DailyDetailProps = {
  date: string;
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

export function DailyDetail({
  date,
  onSessionExpired,
  onClose,
}: DailyDetailProps) {
  const [history, setHistory] = useState<DailyHistory | null>(null);
  const [error, setError] = useState("");

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
          ×
        </button>
      </header>

      {error && (
        <div className="notice error-notice" role="alert">
          {error}
        </div>
      )}
      {!history && !error && <div className="detail-loading">読み込み中…</div>}
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
                {history.hasMissingCheckIn && "対応する入室記録がありません。"}
                {history.hasMissingCheckOut && "対応する退出記録がありません。"}
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
                  {event.eventType === "check_in" ? "入" : "退"}
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
  );
}
