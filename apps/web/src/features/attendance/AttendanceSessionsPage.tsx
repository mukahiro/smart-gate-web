import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import {
  cancelAttendanceSession,
  createAttendanceSession,
  getAttendanceResults,
  getAttendanceSession,
  listAttendanceAuditLogs,
  listAttendanceSessions,
  updateAttendanceSession,
} from "./client";
import type {
  AttendanceAuditLog,
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
const actionLabels: Record<AttendanceAuditLog["action"], string> = {
  attendance_session_created: "作成",
  attendance_session_updated: "更新",
  attendance_session_cancelled: "中止",
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
  const [form, setForm] = useState({ title: "", startsAt: "", endsAt: "" });

  useEffect(() => {
    listAttendanceSessions()
      .then(setSessions)
      .catch((cause) => {
        if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
          setError("出席対象を取得できませんでした。");
        }
      });
  }, [onPermissionDenied, onSessionExpired]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const session = await createAttendanceSession({
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      onSelect(session.id);
    } catch (cause) {
      if (!handleAuthorization(cause, onSessionExpired, onPermissionDenied)) {
        setError(
          cause instanceof ApiError ? cause.message : "作成できませんでした。",
        );
      }
    }
  };

  return (
    <section
      className="admin-card attendance-page"
      aria-labelledby="sessions-title"
    >
      <header className="admin-page-heading card-header">
        <div>
          <h1 id="sessions-title">出席管理</h1>
          <p>授業の受付期間と生徒ごとの出席状況を確認します。</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "閉じる" : "出席対象を作成"}
        </button>
      </header>
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
        </div>
      )}
      {creating && (
        <form
          className="admin-form attendance-form"
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
          <button className="primary-button" type="submit">
            作成する
          </button>
        </form>
      )}
      {!sessions && !error && (
        <div className="admin-loading">読み込んでいます…</div>
      )}
      {sessions?.length === 0 && (
        <div className="admin-empty">出席対象はまだありません。</div>
      )}
      {sessions && sessions.length > 0 && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>開始</th>
                <th>終了</th>
                <th>状態</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <strong>{session.title}</strong>
                  </td>
                  <td>{formatDateTime(session.startsAt)}</td>
                  <td>{formatDateTime(session.endsAt)}</td>
                  <td>
                    <span className="status-badge" data-state={session.status}>
                      {sessionStatusLabels[session.status]}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => onSelect(session.id)}
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
  const [logs, setLogs] = useState<AttendanceAuditLog[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", startsAt: "", endsAt: "" });

  const load = async () => {
    setError("");
    try {
      const [nextSession, nextResults, nextLogs] = await Promise.all([
        getAttendanceSession(sessionId),
        getAttendanceResults(sessionId),
        listAttendanceAuditLogs(sessionId),
      ]);
      setSession(nextSession);
      setResults(nextResults);
      setLogs(nextLogs);
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
          <section className="attendance-audit">
            <h2>変更履歴</h2>
            {logs.map((log) => (
              <p key={log.id}>
                <time>{formatDateTime(log.occurredAt)}</time>　
                {actionLabels[log.action]}　
                <span>{log.changedFields.join("、")}</span>
              </p>
            ))}
          </section>
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
