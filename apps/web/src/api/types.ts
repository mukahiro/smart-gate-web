export type User = {
  id: string;
  studentNumber: string | null;
  name: string;
  lcdDisplayName: string | null;
  email: string;
  userType: "student" | "teacher";
  isAdmin: boolean;
};

export type MonthlyHistoryDay = {
  date: string;
  eventCount: number;
  hasMissingCheckIn: boolean;
  hasMissingCheckOut: boolean;
  stayDurationMinutes: number;
};

export type MonthlyHistory = {
  month: string;
  timeZone: "Asia/Tokyo";
  days: MonthlyHistoryDay[];
  attendanceSessions: MyAttendanceSession[];
};

export type MyAttendanceStatus =
  | "pending"
  | "unregistered"
  | "present"
  | "late"
  | "absent"
  | "cancelled";

export type MyAttendanceSession = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  attendanceStatus: MyAttendanceStatus;
  checkedInAt: string | null;
};

export type DailyHistoryEvent = {
  eventId: string;
  eventType: "check_in" | "check_out";
  method: "card" | "face";
  authenticatedAt: string;
  confidence: number | null;
  pairingStatus: "paired" | "missing_check_in" | "missing_check_out";
};

export type DailyHistory = {
  date: string;
  timeZone: "Asia/Tokyo";
  events: DailyHistoryEvent[];
  hasMissingCheckIn: boolean;
  hasMissingCheckOut: boolean;
  stayDurationMinutes: number;
};
