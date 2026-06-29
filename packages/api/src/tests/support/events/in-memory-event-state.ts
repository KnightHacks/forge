import type { TestEventRecord, TestProviderProjection } from "./fixtures";

interface LeaseState {
  expiresAt: Date;
  revision: number;
  token: string;
}

export interface ProviderAttempt {
  at: Date;
  eventId: string;
  provider: "discord" | "google";
  token: string;
}

export class InMemoryEventWorkflowState {
  readonly attempts: ProviderAttempt[] = [];
  readonly events = new Map<string, TestEventRecord>();
  readonly payloadHashes = new Map<string, string>();
  readonly creationKeys = new Map<string, string>();
  readonly attendanceCounts = new Map<string, number>();
  private readonly leases = new Map<string, LeaseState>();

  constructor(events: readonly TestEventRecord[] = []) {
    for (const event of events) this.seed(event);
  }

  seed(event: TestEventRecord, payloadHash = "seeded-payload") {
    this.events.set(event.id, structuredClone(event));
    this.attendanceCounts.set(event.id, event.attendanceCount);
    if (event.creationKey) {
      this.creationKeys.set(event.creationKey, event.id);
      this.payloadHashes.set(event.id, payloadHash);
    }
  }

  async getEvent(eventId: string) {
    const event = this.events.get(eventId);
    return event ? structuredClone(event) : null;
  }

  async createOrReuseEvent(event: TestEventRecord, payloadHash: string) {
    if (!event.creationKey) throw new Error("A creation key is required.");
    const existingId = this.creationKeys.get(event.creationKey);
    if (existingId) {
      return {
        created: false,
        event: this.requireEvent(existingId),
        payloadMatches: this.payloadHashes.get(existingId) === payloadHash,
      };
    }
    this.seed(event, payloadHash);
    return {
      created: true,
      event: this.requireEvent(event.id),
      payloadMatches: true,
    };
  }

  async saveEvent(event: TestEventRecord) {
    if (!this.events.has(event.id)) return false;
    this.events.set(event.id, structuredClone(event));
    return true;
  }

  async acquireSyncLease({
    eventId,
    expiresAt,
    now,
    revision,
    token,
  }: {
    eventId: string;
    expiresAt: Date;
    now: Date;
    revision: number;
    token: string;
  }) {
    const existing = this.leases.get(eventId);
    if (existing && existing.expiresAt > now) return false;
    this.leases.set(eventId, { expiresAt, revision, token });
    return true;
  }

  async ownsSyncLease(eventId: string, revision: number, token: string) {
    const lease = this.leases.get(eventId);
    return lease?.revision === revision && lease.token === token;
  }

  async recordProviderAttempt(attempt: ProviderAttempt) {
    if (
      !(await this.ownsSyncLease(
        attempt.eventId,
        this.requireEvent(attempt.eventId).revision,
        attempt.token,
      ))
    ) {
      return false;
    }
    this.attempts.push(structuredClone(attempt));
    const event = this.requireEvent(attempt.eventId);
    event[attempt.provider].attemptToken = attempt.token;
    this.events.set(event.id, event);
    return true;
  }

  async saveProviderProjection({
    eventId,
    projection,
    provider,
    revision,
    token,
  }: {
    eventId: string;
    projection: TestProviderProjection;
    provider: "discord" | "google";
    revision: number;
    token: string;
  }) {
    if (!(await this.ownsSyncLease(eventId, revision, token))) return false;
    const event = this.requireEvent(eventId);
    if (event.revision !== revision) return false;
    event[provider] = structuredClone(projection);
    this.events.set(event.id, event);
    return true;
  }

  async releaseSyncLease(eventId: string, token: string) {
    if (this.leases.get(eventId)?.token !== token) return false;
    this.leases.delete(eventId);
    return true;
  }

  async deleteEvent(eventId: string) {
    this.events.delete(eventId);
    this.attendanceCounts.delete(eventId);
  }

  async countAttendance(eventId: string) {
    return this.attendanceCounts.get(eventId) ?? 0;
  }

  setAttendanceCount(eventId: string, count: number) {
    this.attendanceCounts.set(eventId, count);
    const event = this.events.get(eventId);
    if (event) event.attendanceCount = count;
  }

  replaceLease(
    eventId: string,
    revision: number,
    token: string,
    expiresAt: Date,
  ) {
    this.leases.set(eventId, { expiresAt, revision, token });
  }

  private requireEvent(eventId: string) {
    const event = this.events.get(eventId);
    if (!event) throw new Error(`Missing test Event ${eventId}`);
    return structuredClone(event);
  }
}
