const minuteMs = 60_000;
const japanOffsetMs = 9 * 60 * minuteMs;

const toJapanDateTimeFields = (date: Date) => {
  const japanDateTime = new Date(date.getTime() + japanOffsetMs)
    .toISOString()
    .slice(0, 16);
  return {
    date: japanDateTime.slice(0, 10),
    time: japanDateTime.slice(11),
  };
};

export const createSessionDateTimeDefaults = (input: {
  now: Date;
  selectedDate?: string;
  receptionOpenMinutesBefore: number;
  standardClassDurationMinutes: number;
}) => {
  const startFromNow = new Date(
    Math.floor(input.now.getTime() / minuteMs) * minuteMs +
      input.receptionOpenMinutesBefore * minuteMs,
  );
  const startFromNowFields = toJapanDateTimeFields(startFromNow);
  const startDate = input.selectedDate || startFromNowFields.date;
  const startsAt = new Date(`${startDate}T${startFromNowFields.time}:00+09:00`);
  const endsAt = new Date(
    startsAt.getTime() + input.standardClassDurationMinutes * minuteMs,
  );
  const endFields = toJapanDateTimeFields(endsAt);

  return {
    startDate,
    startTime: startFromNowFields.time,
    endDate: endFields.date,
    endTime: endFields.time,
  };
};
