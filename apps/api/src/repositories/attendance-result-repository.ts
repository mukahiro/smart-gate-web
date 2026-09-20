export type StudentFirstCheckIn = {
  userId: string;
  studentNumber: string;
  name: string;
  firstCheckInAt: string | null;
};

export interface AttendanceResultRepository {
  findStudentCheckIns(input: {
    userId: string;
    from: string;
    toExclusive: string;
  }): string[];
  listStudentsWithFirstCheckIn(input: {
    receptionOpensAt: string;
    endsAt: string;
  }): StudentFirstCheckIn[];
}
