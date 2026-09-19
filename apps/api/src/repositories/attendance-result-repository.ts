export type StudentFirstCheckIn = {
  userId: string;
  studentNumber: string;
  name: string;
  firstCheckInAt: string | null;
};

export interface AttendanceResultRepository {
  listStudentsWithFirstCheckIn(input: {
    receptionOpensAt: string;
    endsAt: string;
  }): StudentFirstCheckIn[];
}
