import type {
  TestAttendanceRecord,
  TestEventRecord,
  TestMemberRecord,
} from "./fixtures";

export class InMemoryAttendanceState {
  readonly attendance = new Map<string, TestAttendanceRecord>();
  readonly events = new Map<string, TestEventRecord>();
  readonly members = new Map<string, TestMemberRecord>();
  private readonly pairLocks = new Map<string, Promise<void>>();

  constructor({
    attendance = [],
    events = [],
    members = [],
  }: {
    attendance?: readonly TestAttendanceRecord[];
    events?: readonly TestEventRecord[];
    members?: readonly TestMemberRecord[];
  } = {}) {
    for (const row of attendance)
      this.attendance.set(row.id, structuredClone(row));
    for (const event of events)
      this.events.set(event.id, structuredClone(event));
    for (const member of members)
      this.members.set(member.id, structuredClone(member));
  }

  getEvent(eventId: string) {
    const event = this.events.get(eventId);
    return Promise.resolve(event ? structuredClone(event) : null);
  }

  getMember(memberId: string) {
    const member = this.members.get(memberId);
    return Promise.resolve(member ? structuredClone(member) : null);
  }

  getMemberByUserId(userId: string) {
    const member = [...this.members.values()].find(
      (candidate) => candidate.userId === userId,
    );
    return Promise.resolve(member ? structuredClone(member) : null);
  }

  findAttendance(eventId: string, memberId: string) {
    const row = [...this.attendance.values()].find(
      (candidate) =>
        candidate.eventId === eventId && candidate.memberId === memberId,
    );
    return Promise.resolve(row ? structuredClone(row) : null);
  }

  getAttendance(attendanceId: string) {
    const row = this.attendance.get(attendanceId);
    return Promise.resolve(row ? structuredClone(row) : null);
  }

  async withCheckInLock<T>(
    eventId: string,
    memberId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const key = `${eventId}:${memberId}`;
    const previous = this.pairLocks.get(key) ?? Promise.resolve();
    let release: (() => void) | undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.pairLocks.set(key, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release?.();
      if (this.pairLocks.get(key) === queued) this.pairLocks.delete(key);
    }
  }

  insertAttendanceAndIncrementPoints(
    row: TestAttendanceRecord,
    points: number,
  ) {
    this.attendance.set(row.id, structuredClone(row));
    const member = this.requireMember(row.memberId);
    member.points += points;
    this.members.set(member.id, member);
    return Promise.resolve();
  }

  removeAttendanceAndDecrementPoints(attendanceId: string, points: number) {
    const row = this.attendance.get(attendanceId);
    if (!row) return Promise.resolve(false);
    const member = this.requireMember(row.memberId);
    member.points -= points;
    this.members.set(member.id, member);
    this.attendance.delete(attendanceId);
    return Promise.resolve(true);
  }

  private requireMember(memberId: string) {
    const member = this.members.get(memberId);
    if (!member) throw new Error(`Missing test Member ${memberId}`);
    return structuredClone(member);
  }
}
