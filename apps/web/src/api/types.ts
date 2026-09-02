export type User = {
  id: string;
  studentNumber: string;
  name: string;
  lcdDisplayName: string;
  email: string;
  role: "member" | "admin";
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
