import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildCalendar, formatMonth } from "../history/calendar";
import type { AttendanceSession, AttendanceSessionStatus } from "./types";

type Props = {
  month: string;
  sessions: AttendanceSession[];
  today: string;
  onChangeMonth: (amount: number) => void;
  onSelect: (id: string) => void;
  onToday: () => void;
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
  onChangeMonth,
  onSelect,
  onToday,
}: Props) {
  const sessionsByDate = groupAttendanceSessionsByStartDate(sessions);

  return (
    <section
      className="attendance-calendar-section"
      aria-labelledby="attendance-calendar-title"
    >
      <header className="attendance-calendar-header">
        <h2 id="attendance-calendar-title">{formatMonth(month)}</h2>
        <div>
          <button
            type="button"
            onClick={() => onChangeMonth(-1)}
            aria-label="前月を表示"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={onToday}>
            今月
          </button>
          <button
            type="button"
            onClick={() => onChangeMonth(1)}
            aria-label="翌月を表示"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="attendance-calendar">
        <div className="weekday-row" aria-hidden="true">
          {weekdays.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div
          className="attendance-calendar-grid"
          aria-label="出席対象カレンダー"
        >
          {buildCalendar(month).map((cell) => {
            const dailySessions = sessionsByDate.get(cell.date) ?? [];
            return (
              <div
                className="attendance-calendar-day"
                data-outside={!cell.inCurrentMonth || undefined}
                data-today={cell.date === today || undefined}
                key={cell.date}
              >
                <span className="day-number">{cell.day}</span>
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
