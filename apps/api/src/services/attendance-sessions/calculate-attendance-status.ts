export type StudentAttendanceStatus =
  | "pending"
  | "unregistered"
  | "present"
  | "late"
  | "absent"
  | "cancelled";

export const calculateAttendanceStatus = (input: {
  now: Date;
  startsAt: string;
  endsAt: string;
  lateCutoffAt: string;
  firstCheckInAt: string | null;
  cancelled: boolean;
}): StudentAttendanceStatus => {
  if (input.cancelled) return "cancelled";
  if (input.firstCheckInAt !== null) {
    return input.firstCheckInAt <= input.lateCutoffAt ? "present" : "late";
  }
  if (input.now.getTime() < Date.parse(input.startsAt)) return "pending";
  if (input.now.getTime() < Date.parse(input.endsAt)) return "unregistered";
  return "absent";
};
