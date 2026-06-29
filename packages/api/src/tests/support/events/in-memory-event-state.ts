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

  getEvent(eventId: string) {
    const event = this.events.get(eventId);
    return Promise.resolve(event ? structuredClone(event) : null);
  }

  createOrReuseEvent(event: TestEventRecord, payloadHash: string) {
    if (!event.creationKey) throw new Error("A creation key is required.");
    const existingId = this.creationKeys.get(event.creationKey);
    if (existingId) {
      return Promise.resolve({
        created: false,
        event: this.requireEvent(existingId),
        payloadMatches: this.payloadHashes.get(existingId) === payloadHash,
      });
    }
    this.seed(event, payloadHash);
    return Promise.resolve({
      created: true,
      event: this.requireEvent(event.id),
      payloadMatches: true,
    });
  }

  async saveEvent(event: TestEventRecord, fence?: { token: string }) {
    if (!this.events.has(event.id)) return false;
    if (
      fence &&
      !(await this.ownsSyncLease(event.id, event.revision, fence.token))
    ) {
      return false;
    }
    this.events.set(event.id, structuredClone(event));
    return true;
  }

  acquireSyncLease({
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
    if (existing && existing.expiresAt > now) return Promise.resolve(false);
    this.leases.set(eventId, { expiresAt, revision, token });
    return Promise.resolve(true);
  }

  ownsSyncLease(eventId: string, revision: number, token: string) {
    const lease = this.leases.get(eventId);
    return Promise.resolve(
      lease?.revision === revision && lease.token === token,
    );
  }

  async prepareDeletion({
    at,
    eventId,
    revision,
    token,
  }: {
    at: Date;
    eventId: string;
    revision: number;
    token: string;
  }) {
    if (!(await this.ownsSyncLease(eventId, revision, token))) {
      return "fence_lost" as const;
    }
    const event = this.events.get(eventId);
    if (!event) return "not_found" as const;
    if ((this.attendanceCounts.get(eventId) ?? 0) > 0) {
      return "attendance_exists" as const;
    }
    if (
      event.discord.state === "unknown" &&
      !event.discord.id &&
      !event.discordNoProjectionAcknowledgedAt
    ) {
      return "discord_ambiguous" as const;
    }
    if (
      !event.deletionIntentAt &&
      ((event.discord.attemptToken && event.discord.id) ||
        (event.google.attemptToken && event.google.id))
    ) {
      return "in_flight_attempt" as const;
    }
    event.deletionIntentAt ??= at;
    this.events.set(event.id, structuredClone(event));
    return "ready" as const;
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
    event[attempt.provider].attemptRevision = event.revision;
    event[attempt.provider].attemptToken = attempt.token;
    this.events.set(event.id, event);
    return true;
  }

  renewSyncLease({
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
    const lease = this.leases.get(eventId);
    if (
      lease?.token !== token ||
      lease.revision !== revision ||
      lease.expiresAt <= now
    ) {
      return Promise.resolve(false);
    }
    this.leases.set(eventId, { expiresAt, revision, token });
    return Promise.resolve(true);
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

  releaseSyncLease(eventId: string, token: string) {
    if (this.leases.get(eventId)?.token !== token)
      return Promise.resolve(false);
    this.leases.delete(eventId);
    return Promise.resolve(true);
  }

  async deleteEvent(
    eventId: string,
    fence?: { revision: number; token: string },
  ) {
    if (
      fence &&
      !(await this.ownsSyncLease(eventId, fence.revision, fence.token))
    ) {
      return false;
    }
    const existed = this.events.has(eventId);
    this.events.delete(eventId);
    this.attendanceCounts.delete(eventId);
    return existed;
  }

  countAttendance(eventId: string) {
    return Promise.resolve(this.attendanceCounts.get(eventId) ?? 0);
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
