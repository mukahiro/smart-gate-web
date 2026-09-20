import { TriangleAlert } from "lucide-react";
import type {
  MonthlyHistoryDay,
  MyAttendanceSession,
  MyAttendanceStatus,
} from "../../api/types";
import {
  groupAttendanceSessionsByStartDate,
  japanDateAndTime,
} from "../attendance/AttendanceSessionCalendar";
import { buildCalendar, formatDuration } from "./calendar";

type MonthlyCalendarProps = {
  month: string;
  days: MonthlyHistoryDay[];
  attendanceSessions: MyAttendanceSession[];
  today: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const attendanceStatusLabels: Record<MyAttendanceStatus, string> = {
  pending: "予定",
  unregistered: "予定",
  present: "出席",
  late: "遅刻",
  absent: "欠席",
  cancelled: "中止",
};

export function MonthlyCalendar({
  month,
  days,
  attendanceSessions,
  today,
  selectedDate,
  onSelectDate,
}: MonthlyCalendarProps) {
  const summaries = new Map(days.map((day) => [day.date, day]));
  const attendanceSessionsByDate = groupAttendanceSessionsByStartDate(
    attendanceSessions.filter(
      (session) => session.attendanceStatus !== "cancelled",
    ),
  );

  return (
    <div className="calendar-wrap">
      <div className="weekday-row" aria-hidden="true">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="calendar-grid" aria-label="月別入退室カレンダー">
        {buildCalendar(month).map((cell) => {
          const summary = summaries.get(cell.date);
          const dailySessions = attendanceSessionsByDate.get(cell.date) ?? [];
          const hasMissing =
            summary?.hasMissingCheckIn || summary?.hasMissingCheckOut;
          return (
            <button
              type="button"
              key={cell.date}
              className="calendar-day"
              data-outside={!cell.inCurrentMonth || undefined}
              data-today={cell.date === today || undefined}
              data-selected={cell.date === selectedDate || undefined}
              data-warning={hasMissing || undefined}
              onClick={() => onSelectDate(cell.date)}
              aria-label={`${cell.date}${summary ? `、記録${summary.eventCount}件` : "、記録なし"}${hasMissing ? "、記録不足あり" : ""}${dailySessions.length > 0 ? `、出席対象${dailySessions.length}件` : ""}`}
            >
              <span className="day-number">{cell.day}</span>
              {summary && (
                <span className="day-summary">
                  {hasMissing ? (
                    <TriangleAlert
                      className="history-warning-icon"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="event-dot" aria-hidden="true" />
                  )}
                  <span>{summary.eventCount}件</span>
                  {summary.stayDurationMinutes > 0 && (
                    <span className="day-duration">
                      {formatDuration(summary.stayDurationMinutes)}
                    </span>
                  )}
                </span>
              )}
              {dailySessions.length > 0 && (
                <span className="history-attendance-sessions">
                  {dailySessions.map((session) => (
                    <span
                      className="history-attendance-session"
                      data-status={session.attendanceStatus}
                      key={session.id}
                      title={`${japanDateAndTime(session.startsAt).time} ${session.title}（${attendanceStatusLabels[session.attendanceStatus]}）`}
                    >
                      <time dateTime={session.startsAt}>
                        {japanDateAndTime(session.startsAt).time}
                      </time>
                      <span>{session.title}</span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
