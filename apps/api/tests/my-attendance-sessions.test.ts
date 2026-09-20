import { describe, expect, it, vi } from "vitest";
import type { AttendanceResultRepository } from "../src/repositories/attendance-result-repository";
import type { AttendanceSessionRepository } from "../src/repositories/attendance-session-repository";
import { ListMyAttendanceSessionsUseCase } from "../src/services/attendance-history/list-my-attendance-sessions";

const sessionRepository: AttendanceSessionRepository = {
  list: vi.fn(() => [
    {
      id: "session-001",
      title: "研究ゼミ",
      startsAt: "2026-07-01T00:00:00.000Z",
      endsAt: "2026-07-01T01:30:00.000Z",
      createdByUserId: "teacher-001",
      cancelledAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
  ]),
  findById: vi.fn(),
  listAuditLogs: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
};

const resultRepository: AttendanceResultRepository = {
  findUserCheckIns: vi.fn(() => ["2026-07-01T00:05:00.000Z"]),
  listStudentsWithFirstCheckIn: vi.fn(),
};

describe("ListMyAttendanceSessionsUseCase", () => {
  it("returns the logged-in student's own attendance result", () => {
    const useCase = new ListMyAttendanceSessionsUseCase(
      sessionRepository,
      resultRepository,
      {
        receptionOpenMinutesBefore: 10,
        lateAfterMinutes: 20,
        standardClassDurationMinutes: 90,
      },
      () => new Date("2026-07-01T02:00:00.000Z"),
    );

    expect(useCase.execute("student-001", "2026-07")).toEqual([
      {
        id: "session-001",
        title: "研究ゼミ",
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-07-01T01:30:00.000Z",
        attendanceStatus: "present",
        checkedInAt: "2026-07-01T00:05:00.000Z",
      },
    ]);
    expect(resultRepository.findUserCheckIns).toHaveBeenCalledWith({
      userId: "student-001",
      from: "2026-06-30T23:50:00.000Z",
      toExclusive: "2026-07-01T01:30:00.000Z",
    });
  });

  it("returns the logged-in teacher's own attendance result", () => {
    const useCase = new ListMyAttendanceSessionsUseCase(
      sessionRepository,
      resultRepository,
      {
        receptionOpenMinutesBefore: 10,
        lateAfterMinutes: 20,
        standardClassDurationMinutes: 90,
      },
    );

    expect(useCase.execute("teacher-001", "2026-07")).toEqual([
      {
        id: "session-001",
        title: "研究ゼミ",
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-07-01T01:30:00.000Z",
        attendanceStatus: "present",
        checkedInAt: "2026-07-01T00:05:00.000Z",
      },
    ]);
    expect(resultRepository.findUserCheckIns).toHaveBeenCalledWith({
      userId: "teacher-001",
      from: "2026-06-30T23:50:00.000Z",
      toExclusive: "2026-07-01T01:30:00.000Z",
    });
  });
});
