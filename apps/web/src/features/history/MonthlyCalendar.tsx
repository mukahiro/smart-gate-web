import type { MonthlyHistoryDay } from "../../api/client";
import { buildCalendar, formatDuration } from "./calendar";

type MonthlyCalendarProps = {
  month: string;
  days: MonthlyHistoryDay[];
  today: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

export function MonthlyCalendar({
  month,
  days,
  today,
  selectedDate,
  onSelectDate,
}: MonthlyCalendarProps) {
  const summaries = new Map(days.map((day) => [day.date, day]));

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
              onClick={() => onSelectDate(cell.date)}
              aria-label={`${cell.date}${summary ? `、記録${summary.eventCount}件` : "、記録なし"}`}
            >
              <span className="day-number">{cell.day}</span>
              {summary && (
                <span className="day-summary">
                  <span
                    className="event-dot"
                    data-warning={hasMissing || undefined}
                  />
                  <span>{summary.eventCount}件</span>
                  {summary.stayDurationMinutes > 0 && (
                    <span className="day-duration">
                      {formatDuration(summary.stayDurationMinutes)}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
