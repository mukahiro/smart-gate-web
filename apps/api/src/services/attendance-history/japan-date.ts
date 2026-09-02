export const historyTimeZone = "Asia/Tokyo";

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export const getJapanMonthRange = (month: string) => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return {
    from: new Date(`${month}-01T00:00:00+09:00`).toISOString(),
    toExclusive: new Date(
      `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`,
    ).toISOString(),
  };
};

export const getJapanDayRange = (date: string) => {
  const fromDate = new Date(`${date}T00:00:00+09:00`);

  return {
    from: fromDate.toISOString(),
    toExclusive: new Date(fromDate.getTime() + dayInMilliseconds).toISOString(),
  };
};

export const toJapanDate = (authenticatedAt: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: historyTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(authenticatedAt));
