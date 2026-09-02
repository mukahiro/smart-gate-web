export type CalendarCell = {
  date: string;
  day: number;
  inCurrentMonth: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

const dateText = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const currentJapanDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export const shiftMonth = (month: string, amount: number) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(
    Date.UTC(year ?? 0, (monthNumber ?? 1) - 1 + amount, 1),
  );
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
};

export const buildCalendar = (month: string): CalendarCell[] => {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year ?? 0, (monthNumber ?? 1) - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date: dateText(date),
      day: date.getUTCDate(),
      inCurrentMonth: date.getUTCMonth() === (monthNumber ?? 1) - 1,
    };
  });
};

export const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split("-");
  return `${year}年 ${Number(monthNumber)}月`;
};

export const formatDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day)));
  return `${year}年${month}月${day}日（${weekday}）`;
};

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
};
