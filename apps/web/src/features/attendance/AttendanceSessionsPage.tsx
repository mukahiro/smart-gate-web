import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { currentJapanDate, formatMonth, shiftMonth } from "../history/calendar";
import { AttendanceSessionCalendar } from "./AttendanceSessionCalendar";
import {
  cancelAttendanceSession,
  createAttendanceSession,
  getAttendanceResults,
  getAttendanceSession,
  listAttendanceSessions,
  updateAttendanceSession,
} from "./client";
import type {
  AttendanceResults,
  AttendanceSession,
  AttendanceSessionStatus,
  StudentAttendanceStatus,
} from "./types";

type Props = {
  sessionId?: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onSessionExpired: () => void;
  onPermissionDenied: () => void;
};

const sessionStatusLabels: Record<AttendanceSessionStatus, string> = {
  scheduled: "予定",
  in_progress: "実施中",
  completed: "終了",
  cancelled: "中止",
};
const attendanceStatusLabels: Record<StudentAttendanceStatus, string> = {
  pending: "未判定",
  unregistered: "未登録",
  present: "出席",
  late: "遅刻",
  absent: "欠席",
  cancelled: "中止",
};
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));

const toLocalInput = (value: string) => {
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};

const handleAuthorization = (
  cause: unknown,
  onSessionExpired: () => void,
  onPermissionDenied: () => void,
) => {
  if (!(cause instanceof ApiError)) return false;
  if (cause.status === 401) onSessionExpired();
  else if (cause.status === 403) onPermissionDenied();
  else return false;
  return true;
};

export function AttendanceSessionsPage(props: Props) {
  return props.sessionId ? (
    <AttendanceSessionDetail {...props} sessionId={props.sessionId} />
  ) : (
    <AttendanceSessionList {...props} />
  );
}

const AttendanceSessionList = ({
  onSelect,
  onSessionExpired,
  onPermissionDenied,
}: Props) => {
  const [sessions, setSessions] = useState<AttendanceSession[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });
  const today = currentJapanDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [monthInput, setMonthInput] = useState(month);

  useEffect(() => {
    let active = true;
    setSessions(null);
    setError("");
    listAttendanceSessions(month)
      .then((result) => {
        if (active) setSessions(result);
      })
      .catch((cause) => {
        if (!active) return;
        if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
          setError("出席対象を取得できませんでした。");
        }
      });
    return () => {
      active = false;
    };
  }, [month, onPermissionDenied, onSessionExpired]);

  useEffect(() => {
    if (!creating) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setCreating(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [creating, submitting]);

  useEffect(() => {
    if (!monthPickerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMonthPickerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [monthPickerOpen]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");
    setSubmitting(true);
    try {
      const session = await createAttendanceSession({
        title: form.title,
        startsAt: new Date(
          `${form.startDate}T${form.startTime}:00+09:00`,
        ).toISOString(),
        endsAt: new Date(
          `${form.endDate}T${form.endTime}:00+09:00`,
        ).toISOString(),
      });
      onSelect(session.id);
    } catch (cause) {
      if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
        setCreateError(
          cause instanceof ApiError ? cause.message : "作成できませんでした。",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const closeCreateDialog = () => {
    if (submitting) return;
    setCreating(false);
    setCreateError("");
  };

  const openCreateDialog = (date = "") => {
    setForm({
      title: "",
      startDate: date,
      startTime: "",
      endDate: date,
      endTime: "",
    });
    setCreateError("");
    setCreating(true);
  };

  return (
    <section
      className="history-card attendance-page"
      aria-labelledby="sessions-title"
    >
      <header className="history-heading card-header">
        <nav className="month-tabs" aria-label="表示月の移動">
          <button
            className="month-tab"
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
            aria-label={`${formatMonth(shiftMonth(month, -1))}を表示`}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <div className="month-tab month-tab-current">
            <h1>
              <span className="month-tab-year">{month.slice(0, 4)}年</span>
              {Number(month.slice(5))}月
            </h1>
          </div>
          <button
            className="month-tab"
            type="button"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
            aria-label={`${formatMonth(shiftMonth(month, 1))}を表示`}
          >
            <ChevronRight aria-hidden="true" />
          </button>
          <button
            className="month-tab month-tab-today"
            type="button"
            onClick={() => setMonth(today.slice(0, 7))}
          >
            今月
          </button>
          <button
            className="month-tab month-picker-button"
            type="button"
            onClick={() => {
              setMonthInput(month);
              setMonthPickerOpen(true);
            }}
            aria-label="表示する年月を指定"
          >
            <CalendarDays aria-hidden="true" />
          </button>
        </nav>
      </header>
      <div className="calendar-meta attendance-calendar-meta">
        <div className="calendar-legend-group">
          <h2 id="sessions-title">出席管理</h2>
          <div className="calendar-legend">
            <span>
              <i
                className="attendance-session-symbol"
                data-status="scheduled"
              />
              予定
            </span>
            <span>
              <i
                className="attendance-session-symbol"
                data-status="in_progress"
              />
              実施中
            </span>
            <span>
              <i
                className="attendance-session-symbol"
                data-status="completed"
              />
              終了
            </span>
            <span>
              <i
                className="attendance-session-symbol"
                data-status="cancelled"
              />
              中止
            </span>
          </div>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => openCreateDialog()}
        >
          出席対象を作成
        </button>
      </div>
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
        </div>
      )}
      {creating && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateDialog();
          }}
        >
          <dialog
            open
            className="dialog-card attendance-create-dialog"
            aria-labelledby="attendance-create-title"
            aria-modal="true"
          >
            <header className="dialog-header">
              <div>
                <h2 id="attendance-create-title">出席対象を作成</h2>
                <p>名称と授業の開始・終了日時を入力してください。</p>
              </div>
              <button
                className="icon-button close-button"
                type="button"
                disabled={submitting}
                onClick={closeCreateDialog}
                aria-label="出席対象の作成を閉じる"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            {createError && (
              <div className="notice error-notice" role="alert">
                {createError}
              </div>
            )}
            <form
              className="admin-form attendance-create-form"
              onSubmit={(event) => void submit(event)}
            >
              <label>
                名称
                <input
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <div className="attendance-create-datetime-fields">
                <label>
                  開始日
                  <input
                    required
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  開始時刻
                  <input
                    required
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </label>
                <label>
                  終了日
                  <input
                    required
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  終了時刻
                  <input
                    required
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={submitting}
                  onClick={closeCreateDialog}
                >
                  キャンセル
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "作成中…" : "作成する"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
      {monthPickerOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMonthPickerOpen(false);
            }
          }}
        >
          <dialog
            open
            className="dialog-card month-picker-dialog"
            aria-labelledby="attendance-month-picker-title"
            aria-modal="true"
          >
            <header className="dialog-header">
              <h2 id="attendance-month-picker-title">年月を指定</h2>
              <button
                className="icon-button close-button"
                type="button"
                onClick={() => setMonthPickerOpen(false)}
                aria-label="年月指定を閉じる"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <form
              className="month-picker-form"
              onSubmit={(event) => {
                event.preventDefault();
                setMonth(monthInput);
                setMonthPickerOpen(false);
              }}
            >
              <label>
                表示する年月
                <input
                  type="month"
                  required
                  value={monthInput}
                  onChange={(event) => setMonthInput(event.target.value)}
                />
              </label>
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setMonthPickerOpen(false)}
                >
                  キャンセル
                </button>
                <button className="primary-button" type="submit">
                  表示
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
      {!sessions && !error && (
        <div className="admin-loading">読み込んでいます…</div>
      )}
      {sessions && (
        <AttendanceSessionCalendar
          month={month}
          sessions={sessions}
          today={today}
          onSelect={onSelect}
          onCreateForDate={openCreateDialog}
        />
      )}
    </section>
  );
};

const AttendanceSessionDetail = ({
  sessionId,
  onBack,
  onSessionExpired,
  onPermissionDenied,
}: Props & { sessionId: string }) => {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [results, setResults] = useState<AttendanceResults | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", startsAt: "", endsAt: "" });

  const load = async () => {
    setError("");
    try {
      const [nextSession, nextResults] = await Promise.all([
        getAttendanceSession(sessionId),
        getAttendanceResults(sessionId),
      ]);
      setSession(nextSession);
      setResults(nextResults);
      setForm({
        title: nextSession.title,
        startsAt: toLocalInput(nextSession.startsAt),
        endsAt: toLocalInput(nextSession.endsAt),
      });
    } catch (cause) {
      if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
        setError("出席対象を取得できませんでした。");
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ID変更時に詳細一式を再取得する。
  useEffect(() => {
    void load();
  }, [sessionId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    try {
      await updateAttendanceSession(session.id, {
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        expectedUpdatedAt: session.updatedAt,
      });
      await load();
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === "ATTENDANCE_SESSION_CONFLICT"
      ) {
        setError("別の先生が更新しました。最新内容を再読み込みしてください。");
      } else if (
        !handleAuthorization(cause, onSessionExpired, onPermissionDenied)
      ) {
        setError(
          cause instanceof ApiError ? cause.message : "更新できませんでした。",
        );
      }
    }
  };

  const cancel = async () => {
    if (!session || !window.confirm("この出席対象を中止しますか？")) return;
    try {
      await cancelAttendanceSession(session.id, session.updatedAt);
      await load();
    } catch (cause) {
      if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
        setError(
          cause instanceof ApiError ? cause.message : "中止できませんでした。",
        );
      }
    }
  };

  return (
    <section className="admin-card attendance-page">
      <button className="back-button" type="button" onClick={onBack}>
        一覧へ戻る
      </button>
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
          <button type="button" onClick={() => void load()}>
            再読み込み
          </button>
        </div>
      )}
      {!session && !error && (
        <div className="admin-loading">読み込んでいます…</div>
      )}
      {session && (
        <>
          <header className="admin-page-heading">
            <div>
              <h1>{session.title}</h1>
              <p>
                <span className="status-badge" data-state={session.status}>
                  {sessionStatusLabels[session.status]}
                </span>
              </p>
            </div>
            {!session.cancelledAt && (
              <button
                className="danger-button"
                type="button"
                onClick={() => void cancel()}
              >
                中止する
              </button>
            )}
          </header>
          <form
            className="admin-form attendance-form"
            onSubmit={(event) => void save(event)}
          >
            <label>
              名称
              <input
                required
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              開始日時
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label>
              終了日時
              <input
                required
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={session.status === "cancelled"}
            >
              保存する
            </button>
          </form>
          {results && <ResultsTable results={results} />}
        </>
      )}
    </section>
  );
};

const ResultsTable = ({ results }: { results: AttendanceResults }) => (
  <section className="attendance-results">
    <h2>出席状況</h2>
    <div className="attendance-summary">
      <span>対象 {results.summary.targetStudentCount}</span>
      <span>出席 {results.summary.presentCount}</span>
      <span>遅刻 {results.summary.lateCount}</span>
      <span>欠席 {results.summary.absentCount}</span>
    </div>
    <div className="user-table-wrap">
      <table className="user-table">
        <thead>
          <tr>
            <th>生徒</th>
            <th>学籍番号</th>
            <th>状態</th>
            <th>最初の入室</th>
          </tr>
        </thead>
        <tbody>
          {results.students.map((student) => (
            <tr key={student.userId}>
              <td>
                <strong>{student.name}</strong>
              </td>
              <td>{student.studentNumber}</td>
              <td>
                <span className="status-badge" data-state={student.status}>
                  {attendanceStatusLabels[student.status]}
                </span>
              </td>
              <td>
                {student.checkedInAt
                  ? formatDateTime(student.checkedInAt)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
