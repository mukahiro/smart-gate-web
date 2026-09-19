export type AttendancePolicy = {
  receptionOpenMinutesBefore: number;
  lateAfterMinutes: number;
};

const readNonNegativeInteger = (
  name: string,
  value: string | undefined,
  defaultValue: number,
): number => {
  if (value === undefined) {
    return defaultValue;
  }

  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
};

export const readAttendancePolicy = (
  env: NodeJS.ProcessEnv = process.env,
): AttendancePolicy => ({
  receptionOpenMinutesBefore: readNonNegativeInteger(
    "ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE",
    env.ATTENDANCE_RECEPTION_OPEN_MINUTES_BEFORE,
    10,
  ),
  lateAfterMinutes: readNonNegativeInteger(
    "ATTENDANCE_LATE_AFTER_MINUTES",
    env.ATTENDANCE_LATE_AFTER_MINUTES,
    20,
  ),
});
