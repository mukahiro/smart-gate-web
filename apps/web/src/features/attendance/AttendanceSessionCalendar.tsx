import { buildCalendar } from "../history/calendar";
import type { AttendanceSession, AttendanceSessionStatus } from "./types";

type Props = {
  month: string;
  sessions: AttendanceSession[];
  today: string;
  onSelect: (id: string) => void;
  onCreateForDate?: (date: string) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

const statusLabels: Record<AttendanceSessionStatus, string> = {
  scheduled: "予定",
  in_progress: "実施中",
  completed: "終了",
  cancelled: "中止",
};

export const japanDateAndTime = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};

export const groupAttendanceSessionsByStartDate = (
  sessions: AttendanceSession[],
) => {
  const grouped = new Map<string, AttendanceSession[]>();
  for (const session of sessions) {
    const date = japanDateAndTime(session.startsAt).date;
    grouped.set(date, [...(grouped.get(date) ?? []), session]);
  }
  for (const values of grouped.values()) {
    values.sort(
      (left, right) =>
        Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
        left.id.localeCompare(right.id),
    );
  }
  return grouped;
};

export function AttendanceSessionCalendar({
  month,
  sessions,
  today,
  onSelect,
  onCreateForDate,
}: Props) {
  const sessionsByDate = groupAttendanceSessionsByStartDate(sessions);

  return (
    <section
      className="attendance-calendar-section"
      aria-label="出席対象カレンダー"
    >
      <div className="calendar-wrap">
        <div className="weekday-row" aria-hidden="true">
          {weekdays.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="calendar-grid" aria-label="月別出席対象カレンダー">
          {buildCalendar(month).map((cell) => {
            const dailySessions = sessionsByDate.get(cell.date) ?? [];
            return (
              <div
                className="calendar-day attendance-calendar-day"
                data-outside={!cell.inCurrentMonth || undefined}
                data-today={cell.date === today || undefined}
                key={cell.date}
              >
                <button
                  className="attendance-calendar-create"
                  type="button"
                  aria-label={`${cell.date}に出席対象を作成`}
                  disabled={!onCreateForDate}
                  onClick={() => onCreateForDate?.(cell.date)}
                >
                  <span className="day-number">{cell.day}</span>
                </button>
                <div className="attendance-calendar-events">
                  {dailySessions.map((session) => (
                    <button
                      type="button"
                      key={session.id}
                      data-status={session.status}
                      title={`${japanDateAndTime(session.startsAt).time} ${session.title}（${statusLabels[session.status]}）`}
                      onClick={() => onSelect(session.id)}
                    >
                      <time dateTime={session.startsAt}>
                        {japanDateAndTime(session.startsAt).time}
                      </time>
                      <span>{session.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
