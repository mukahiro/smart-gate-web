import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import { currentJapanDate, formatMonth, shiftMonth } from "../history/calendar";
import { AttendanceSessionCalendar } from "./AttendanceSessionCalendar";
import {
  cancelAttendanceSession,
  createAttendanceSession,
  getAttendanceResults,
  getAttendanceSession,
  getAttendanceSessionDefaults,
  listAttendanceSessions,
  updateAttendanceSession,
} from "./client";
import { createSessionDateTimeDefaults } from "./create-session-defaults";
import {
  type AttendanceStatusFilter,
  countAttendanceStatuses,
  filterAttendanceStudents,
} from "./filter-attendance-results";
import type {
  AttendanceResults,
  AttendanceSession,
  AttendanceSessionDefaults,
  AttendanceSessionStatus,
  StudentAttendanceStatus,
} from "./types";

type Props = {
  sessionId?: string;
  onSelect: (id: string) => void;
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
const attendanceResultsRefreshIntervalMs = 3_000;
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
  const [sessionDefaults, setSessionDefaults] =
    useState<AttendanceSessionDefaults | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [defaultsError, setDefaultsError] = useState("");
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
    let active = true;
    setDefaultsError("");
    getAttendanceSessionDefaults()
      .then((defaults) => {
        if (active) setSessionDefaults(defaults);
      })
      .catch((cause) => {
        if (!active) return;
        if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
          setDefaultsError("出席対象の初期設定を取得できませんでした。");
        }
      });
    return () => {
      active = false;
    };
  }, [onPermissionDenied, onSessionExpired]);

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
    if (!sessionDefaults) return;
    const dateTimeDefaults = createSessionDateTimeDefaults({
      now: new Date(),
      selectedDate: date,
      ...sessionDefaults,
    });
    setForm({
      title: "",
      ...dateTimeDefaults,
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
          disabled={!sessionDefaults}
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
      {defaultsError && (
        <div className="notice error-notice" role="alert">
          {defaultsError}
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
          onCreateForDate={sessionDefaults ? openCreateDialog : undefined}
        />
      )}
    </section>
  );
};

const AttendanceSessionDetail = ({
  sessionId,
  onSessionExpired,
  onPermissionDenied,
}: Props & { sessionId: string }) => {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [results, setResults] = useState<AttendanceResults | null>(null);
  const [error, setError] = useState("");
  const [resultsRefreshError, setResultsRefreshError] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
      setResultsRefreshError("");
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

  useEffect(() => {
    if (!session) return;
    let active = true;
    let timerId: number | undefined;

    const refreshResults = async () => {
      try {
        const nextResults = await getAttendanceResults(sessionId);
        if (!active) return;
        setResults(nextResults);
        setResultsRefreshError("");
      } catch (cause) {
        if (!active) return;
        if (handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
          active = false;
          return;
        }
        setResultsRefreshError(
          "最新の出席状況を取得できませんでした。自動的に再試行します。",
        );
      }

      if (active) {
        timerId = window.setTimeout(
          refreshResults,
          attendanceResultsRefreshIntervalMs,
        );
      }
    };

    timerId = window.setTimeout(
      refreshResults,
      attendanceResultsRefreshIntervalMs,
    );
    return () => {
      active = false;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [session, sessionId, onSessionExpired, onPermissionDenied]);

  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setEditing(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editing, saving]);

  const openEditDialog = () => {
    if (!session) return;
    setForm({
      title: session.title,
      startsAt: toLocalInput(session.startsAt),
      endsAt: toLocalInput(session.endsAt),
    });
    setEditError("");
    setEditing(true);
  };

  const closeEditDialog = () => {
    if (saving) return;
    setEditing(false);
    setEditError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setEditError("");
    try {
      await updateAttendanceSession(session.id, {
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        expectedUpdatedAt: session.updatedAt,
      });
      await load();
      setEditing(false);
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === "ATTENDANCE_SESSION_CONFLICT"
      ) {
        setEditError(
          "別の先生が更新しました。モーダルを閉じて最新内容を再読み込みしてください。",
        );
      } else if (
        !handleAuthorization(cause, onSessionExpired, onPermissionDenied)
      ) {
        setEditError(
          cause instanceof ApiError ? cause.message : "更新できませんでした。",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!session || !window.confirm("この出席対象を中止しますか？")) return;
    setSaving(true);
    setEditError("");
    try {
      await cancelAttendanceSession(session.id, session.updatedAt);
      await load();
      setEditing(false);
    } catch (cause) {
      if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
        setEditError(
          cause instanceof ApiError ? cause.message : "中止できませんでした。",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-card attendance-page">
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
                className="primary-button"
                type="button"
                onClick={openEditDialog}
              >
                編集する
              </button>
            )}
          </header>
          <dl className="attendance-session-metadata">
            <div>
              <dt>開始日時</dt>
              <dd>{formatDateTime(session.startsAt)}</dd>
            </div>
            <div>
              <dt>終了日時</dt>
              <dd>{formatDateTime(session.endsAt)}</dd>
            </div>
          </dl>
          {results && (
            <ResultsTable
              results={results}
              refreshError={resultsRefreshError}
            />
          )}
          {editing && (
            <div
              className="dialog-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeEditDialog();
              }}
            >
              <dialog
                open
                className="dialog-card attendance-edit-dialog"
                aria-labelledby="attendance-edit-title"
                aria-modal="true"
              >
                <header className="dialog-header">
                  <div>
                    <h2 id="attendance-edit-title">出席対象を編集</h2>
                    <p>名称と授業の開始・終了日時を変更できます。</p>
                  </div>
                  <button
                    className="icon-button close-button"
                    type="button"
                    disabled={saving}
                    onClick={closeEditDialog}
                    aria-label="出席対象の編集を閉じる"
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>
                {editError && (
                  <div className="notice error-notice" role="alert">
                    {editError}
                  </div>
                )}
                <form
                  className="admin-form"
                  onSubmit={(event) => void save(event)}
                >
                  <label>
                    名称
                    <input
                      required
                      maxLength={100}
                      value={form.title}
                      onChange={(event) =>
                        setForm({ ...form, title: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    開始日時
                    <input
                      required
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(event) =>
                        setForm({ ...form, startsAt: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    終了日時
                    <input
                      required
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(event) =>
                        setForm({ ...form, endsAt: event.target.value })
                      }
                    />
                  </label>
                  <div className="attendance-edit-actions">
                    <button
                      className="danger-button"
                      type="button"
                      disabled={saving}
                      onClick={() => void cancel()}
                    >
                      出席対象を中止
                    </button>
                    <div className="dialog-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={saving}
                        onClick={closeEditDialog}
                      >
                        キャンセル
                      </button>
                      <button
                        className="primary-button"
                        type="submit"
                        disabled={saving}
                      >
                        {saving ? "保存中…" : "保存する"}
                      </button>
                    </div>
                  </div>
                </form>
              </dialog>
            </div>
          )}
        </>
      )}
    </section>
  );
};

const resultFilterOrder: Array<{
  status: StudentAttendanceStatus;
  label: string;
}> = [
  { status: "present", label: "出席" },
  { status: "late", label: "遅刻" },
  { status: "absent", label: "欠席" },
];

const ResultsTable = ({
  results,
  refreshError,
}: {
  results: AttendanceResults;
  refreshError: string;
}) => {
  const [statusFilter, setStatusFilter] =
    useState<AttendanceStatusFilter>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const filteredStudents = filterAttendanceStudents(
    results.students,
    statusFilter,
  );
  const statusCounts = countAttendanceStatuses(results.students);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === resultsRef.current);
    };
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === resultsRef.current) {
      await document.exitFullscreen();
      return;
    }
    await resultsRef.current?.requestFullscreen();
  };

  return (
    <section className="attendance-results" ref={resultsRef}>
      <header className="attendance-results-header">
        <h2>出席状況</h2>
        {document.fullscreenEnabled && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={
              isFullscreen ? "全画面表示を終了" : "全画面表示に切り替え"
            }
          >
            {isFullscreen ? (
              <Minimize2 aria-hidden="true" />
            ) : (
              <Maximize2 aria-hidden="true" />
            )}
            {isFullscreen ? "全画面を終了" : "全画面表示"}
          </button>
        )}
      </header>
      {refreshError && (
        <div className="notice error-notice" role="alert">
          {refreshError}
        </div>
      )}
      <div className="attendance-summary" aria-label="出席状態で絞り込み">
        <button
          type="button"
          aria-pressed={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        >
          すべて {results.summary.targetStudentCount}
        </button>
        {resultFilterOrder.map(({ status, label }) => (
          <button
            type="button"
            key={status}
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          >
            {label} {statusCounts[status] ?? 0}
          </button>
        ))}
      </div>
      {filteredStudents.length === 0 ? (
        <div className="attendance-result-empty">
          選択した状態に該当する生徒はいません。
        </div>
      ) : (
        <div className="user-table-wrap">
          <table className="user-table attendance-results-table">
            <thead>
              <tr>
                <th>生徒</th>
                <th>学籍番号</th>
                <th>状態</th>
                <th>最初の入室</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
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
      )}
    </section>
  );
};
