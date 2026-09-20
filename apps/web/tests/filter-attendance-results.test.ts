import { describe, expect, it } from "vitest";
import {
  type AttendanceStudent,
  countAttendanceStatuses,
  filterAttendanceStudents,
} from "../src/features/attendance/filter-attendance-results";

const students: AttendanceStudent[] = [
  {
    userId: "student-001",
    studentNumber: "0000000001",
    name: "出席者",
    status: "present",
    checkedInAt: "2026-10-01T00:00:00.000Z",
  },
  {
    userId: "student-002",
    studentNumber: "0000000002",
    name: "遅刻者",
    status: "late",
    checkedInAt: "2026-10-01T00:30:00.000Z",
  },
  {
    userId: "student-003",
    studentNumber: "0000000003",
    name: "欠席者",
    status: "absent",
    checkedInAt: null,
  },
];

describe("attendance result filters", () => {
  it("filters students by status and keeps all students for all", () => {
    expect(filterAttendanceStudents(students, "all")).toEqual(students);
    expect(filterAttendanceStudents(students, "late")).toEqual([students[1]]);
    expect(filterAttendanceStudents(students, "cancelled")).toEqual([]);
  });

  it("counts each displayed status", () => {
    expect(countAttendanceStatuses(students)).toEqual({
      present: 1,
      late: 1,
      absent: 1,
    });
  });
});
