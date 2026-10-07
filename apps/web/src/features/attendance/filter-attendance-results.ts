import type { AttendanceResults, StudentAttendanceStatus } from "./types";

export type AttendanceStatusFilter = StudentAttendanceStatus | "all";
export type AttendanceStudent = AttendanceResults["students"][number];

export const filterAttendanceStudents = (
  students: AttendanceStudent[],
  status: AttendanceStatusFilter,
) =>
  status === "all"
    ? students
    : students.filter((student) => student.status === status);

export const countAttendanceStatuses = (students: AttendanceStudent[]) =>
  students.reduce<Partial<Record<StudentAttendanceStatus, number>>>(
    (counts, student) => {
      counts[student.status] = (counts[student.status] ?? 0) + 1;
      return counts;
    },
    {},
  );
