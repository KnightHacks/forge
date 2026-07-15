import type {
  TestAttendanceRecord,
  TestEventRecord,
  TestMemberRecord,
} from "./fixtures";

export interface TestFeedbackAnswers {
  customAnswers?: Record<string, unknown>;
  discovery: string;
  discoveryOther?: string;
  fun: number;
  improve?: string;
  learning: number;
  overall: number;
  worked?: string;
}

export interface TestFeedbackConfig {
  closesAt: Date;
  coreTemplateRevision: number;
  eventId: string;
  formId: string;
  rewardPoints: number;
  customQuestions?: unknown[];
}

export interface TestFeedbackForm {
  id: string;
  kind: "event_feedback";
  locked: boolean;
  slug: string;
  title: string;
}

export interface TestFeedbackResponse {
  answers: TestFeedbackAnswers;
  eventId: string;
  formId: string;
  id: string;
  memberId: string;
  submittedAt: Date;
}

export interface TestFeedbackReward {
  amount: number;
  awardedAt: Date;
  eventId: string;
  id: string;
  memberId: string;
  responseId: string | null;
}

export class InMemoryFeedbackState {
  readonly attendance = new Map<string, TestAttendanceRecord>();
  readonly configs = new Map<string, TestFeedbackConfig>();
  readonly events = new Map<string, TestEventRecord>();
  readonly forms = new Map<string, TestFeedbackForm>();
  readonly members = new Map<string, TestMemberRecord>();
  readonly responses = new Map<string, TestFeedbackResponse>();
  readonly rewards = new Map<string, TestFeedbackReward>();
  private readonly pairLocks = new Map<string, Promise<void>>();

  constructor({
    attendance = [],
    configs = [],
    events = [],
    forms = [],
    members = [],
    responses = [],
    rewards = [],
  }: {
    attendance?: readonly TestAttendanceRecord[];
    configs?: readonly TestFeedbackConfig[];
    events?: readonly TestEventRecord[];
    forms?: readonly TestFeedbackForm[];
    members?: readonly TestMemberRecord[];
    responses?: readonly TestFeedbackResponse[];
    rewards?: readonly TestFeedbackReward[];
  } = {}) {
    for (const row of attendance)
      this.attendance.set(row.id, structuredClone(row));
    for (const config of configs)
      this.configs.set(config.eventId, structuredClone(config));
    for (const event of events)
      this.events.set(event.id, structuredClone(event));
    for (const form of forms) this.forms.set(form.id, structuredClone(form));
    for (const member of members)
      this.members.set(member.id, structuredClone(member));
    for (const response of responses)
      this.responses.set(response.id, structuredClone(response));
    for (const reward of rewards)
      this.rewards.set(this.rewardKey(reward.eventId, reward.memberId), {
        ...structuredClone(reward),
      });
  }

  getEvent(eventId: string) {
    return Promise.resolve(this.clone(this.events.get(eventId)));
  }

  getMember(memberId: string) {
    return Promise.resolve(this.clone(this.members.get(memberId)));
  }

  getFeedbackConfigByEventId(eventId: string) {
    return Promise.resolve(this.clone(this.configs.get(eventId)));
  }

  getFeedbackConfigByFormId(formId: string) {
    const config = [...this.configs.values()].find(
      (candidate) => candidate.formId === formId,
    );
    return Promise.resolve(this.clone(config));
  }

  listFeedbackConfigs() {
    return Promise.resolve(
      [...this.configs.values()].map((config) => structuredClone(config)),
    );
  }

  listAttendanceForMember(memberId: string) {
    return Promise.resolve(
      [...this.attendance.values()]
        .filter((row) => row.memberId === memberId)
        .map((row) => structuredClone(row)),
    );
  }

  insertFeedbackFormAndConfig(
    form: TestFeedbackForm,
    config: TestFeedbackConfig,
  ) {
    const existing = this.configs.get(config.eventId);
    if (existing) return Promise.resolve(structuredClone(existing));
    if (this.forms.has(form.id)) throw new Error("Duplicate feedback form ID");
    if (
      [...this.configs.values()].some(
        (candidate) => candidate.formId === config.formId,
      )
    )
      throw new Error("A feedback form may belong to only one event");
    this.forms.set(form.id, structuredClone(form));
    this.configs.set(config.eventId, structuredClone(config));
    return Promise.resolve(structuredClone(config));
  }

  updateFeedbackDeadline(eventId: string, closesAt: Date) {
    const config = this.configs.get(eventId);
    if (!config) return Promise.resolve(null);
    const updated = {
      ...config,
      closesAt: structuredClone(closesAt),
    };
    this.configs.set(eventId, updated);
    return Promise.resolve(structuredClone(updated));
  }

  hasAttendance(eventId: string, memberId: string) {
    return Promise.resolve(
      [...this.attendance.values()].some(
        (row) => row.eventId === eventId && row.memberId === memberId,
      ),
    );
  }

  countDistinctAttendees(eventId: string) {
    return Promise.resolve(
      new Set(
        [...this.attendance.values()]
          .filter((row) => row.eventId === eventId)
          .map((row) => row.memberId),
      ).size,
    );
  }

  findFeedbackResponse(eventId: string, memberId: string) {
    const response = [...this.responses.values()].find(
      (candidate) =>
        candidate.eventId === eventId && candidate.memberId === memberId,
    );
    return Promise.resolve(this.clone(response));
  }

  getFeedbackResponse(responseId: string) {
    return Promise.resolve(this.clone(this.responses.get(responseId)));
  }

  listFeedbackResponses(eventId: string) {
    return Promise.resolve(
      [...this.responses.values()]
        .filter((response) => response.eventId === eventId)
        .map((response) => structuredClone(response)),
    );
  }

  findFeedbackReward(eventId: string, memberId: string) {
    return Promise.resolve(
      this.clone(this.rewards.get(this.rewardKey(eventId, memberId))),
    );
  }

  async withFeedbackLock<T>(
    eventId: string,
    memberId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const key = this.rewardKey(eventId, memberId);
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

  insertResponseRewardAndIncrementPoints(
    response: TestFeedbackResponse,
    reward: TestFeedbackReward,
  ) {
    const rewardKey = this.rewardKey(reward.eventId, reward.memberId);
    if (this.rewards.has(rewardKey))
      throw new Error("Duplicate feedback reward");
    if (this.responses.has(response.id))
      throw new Error("Duplicate feedback response");
    const member = this.members.get(reward.memberId);
    if (!member) throw new Error(`Missing test Member ${reward.memberId}`);

    this.responses.set(response.id, structuredClone(response));
    this.rewards.set(rewardKey, structuredClone(reward));
    this.members.set(member.id, {
      ...structuredClone(member),
      points: member.points + reward.amount,
    });
    return Promise.resolve();
  }

  deleteResponseAndDetachReward(responseId: string) {
    const response = this.responses.get(responseId);
    if (!response) return Promise.resolve(false);
    const rewardKey = this.rewardKey(response.eventId, response.memberId);
    const reward = this.rewards.get(rewardKey);
    if (reward)
      this.rewards.set(rewardKey, {
        ...structuredClone(reward),
        responseId: null,
      });
    this.responses.delete(responseId);
    return Promise.resolve(true);
  }

  private clone<T>(value: T | undefined): T | null {
    return value === undefined ? null : structuredClone(value);
  }

  private rewardKey(eventId: string, memberId: string) {
    return `${eventId}:${memberId}`;
  }
}
