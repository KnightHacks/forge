import { describe, expect, it, vi } from "vitest";

import { FORMS } from "@forge/consts";

import type {
  TestFeedbackAnswers,
  TestFeedbackConfig,
  TestFeedbackForm,
  TestFeedbackResponse,
  TestFeedbackReward,
} from "../support/events/in-memory-feedback-state";
import { createEventFeedbackService } from "../../utils/events/feedback";
import { createTestClock } from "../support/events/fake-clock";
import {
  attendanceRecord,
  EVENT_IDS,
  eventRecord,
  MEMBER_IDS,
  memberRecord,
  NOW,
} from "../support/events/fixtures";
import { InMemoryFeedbackState } from "../support/events/in-memory-feedback-state";

const DAY = 24 * 60 * 60 * 1000;
const FEEDBACK_POINTS = 5;
const PROTECTED_ROLE_ID = "00000000-0000-4000-8000-000000000801";
const PROJECTS_ROLE_ID = "00000000-0000-4000-8000-000000000802";
const PROTECTED_NAME_LOOKALIKE_ID = "00000000-0000-4000-8000-000000000803";
const FORM_IDS = {
  primary: "00000000-0000-4000-8000-000000000901",
  secondary: "00000000-0000-4000-8000-000000000902",
} as const;
const RESPONSE_IDS = {
  first: "00000000-0000-4000-8000-000000000911",
  second: "00000000-0000-4000-8000-000000000912",
  third: "00000000-0000-4000-8000-000000000913",
} as const;
const REWARD_IDS = {
  first: "00000000-0000-4000-8000-000000000921",
} as const;
const CUSTOM_QUESTION_IDS = {
  rating: "00000000-0000-4000-8000-000000000931",
  text: "00000000-0000-4000-8000-000000000932",
} as const;
const EXTRA_MEMBER_ID = "00000000-0000-4000-8000-000000000203";
const EXTRA_USER_ID = "00000000-0000-4000-8000-000000000304";

const validAnswers: TestFeedbackAnswers = {
  discovery: "Discord",
  fun: 4,
  improve: "Leave more build time.",
  learning: 3,
  overall: 5,
  worked: "The live examples.",
};

function endedEvent(overrides: Parameters<typeof eventRecord>[0] = {}) {
  return eventRecord({
    endAt: new Date(NOW.getTime() - DAY),
    id: EVENT_IDS.ended,
    name: "Completed Workshop",
    startAt: new Date(NOW.getTime() - DAY - 60 * 60 * 1000),
    ...overrides,
  });
}

function feedbackForm(
  overrides: Partial<TestFeedbackForm> = {},
): TestFeedbackForm {
  return {
    id: FORM_IDS.primary,
    kind: "event_feedback",
    locked: true,
    slug: "event-feedback-completed-workshop-000000000108",
    title: "Completed Workshop Feedback",
    ...overrides,
  };
}

function feedbackConfig(
  overrides: Partial<TestFeedbackConfig> = {},
): TestFeedbackConfig {
  const event = endedEvent();
  return {
    closesAt: new Date(event.endAt.getTime() + 7 * DAY),
    coreTemplateRevision: 1,
    eventId: event.id,
    formId: FORM_IDS.primary,
    rewardPoints: FEEDBACK_POINTS,
    ...overrides,
  };
}

function feedbackResponse(
  overrides: Partial<TestFeedbackResponse> = {},
): TestFeedbackResponse {
  return {
    answers: structuredClone(validAnswers),
    eventId: EVENT_IDS.ended,
    formId: FORM_IDS.primary,
    id: RESPONSE_IDS.first,
    memberId: MEMBER_IDS.member,
    submittedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    ...overrides,
  };
}

function feedbackReward(
  overrides: Partial<TestFeedbackReward> = {},
): TestFeedbackReward {
  return {
    amount: FEEDBACK_POINTS,
    awardedAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    eventId: EVENT_IDS.ended,
    id: REWARD_IDS.first,
    memberId: MEMBER_IDS.member,
    responseId: RESPONSE_IDS.first,
    ...overrides,
  };
}

function requireFeedbackConfig(state: InMemoryFeedbackState, eventId: string) {
  const config = state.configs.get(eventId);
  if (!config) throw new Error(`Missing test feedback config for ${eventId}`);
  return config;
}

function setup({
  attendance = [],
  configs = [],
  events = [endedEvent()],
  forms = [],
  members = [memberRecord()],
  responses = [],
  rewards = [],
}: ConstructorParameters<typeof InMemoryFeedbackState>[0] = {}) {
  const audit = vi.fn().mockResolvedValue(undefined);
  const clock = createTestClock(NOW);
  const state = new InMemoryFeedbackState({
    attendance,
    configs,
    events,
    forms,
    members,
    responses,
    rewards,
  });
  let idSequence = 0;
  const service = createEventFeedbackService({
    audit,
    clock: clock.now,
    idFactory: () =>
      `10000000-0000-4000-8000-${String(++idSequence).padStart(12, "0")}`,
    protectedRoleIds: new Set([PROTECTED_ROLE_ID]),
    state,
  });
  return { audit, clock, service, state };
}

describe("club event feedback", () => {
  it("[TC-039, TC-040, TC-NEG-011] provisions only explicitly qualifying club events by stable role ID", async () => {
    const publicEvent = endedEvent();
    const protectedEvent = endedEvent({
      id: "00000000-0000-4000-8000-000000000109",
      roleIds: [PROTECTED_ROLE_ID],
    });
    const projectsEvent = endedEvent({
      id: "00000000-0000-4000-8000-000000000110",
      roleIds: [PROJECTS_ROLE_ID],
    });
    const renamedLookalikeEvent = endedEvent({
      id: "00000000-0000-4000-8000-000000000111",
      roleIds: [PROTECTED_NAME_LOOKALIKE_ID],
    });
    const hackathonEvent = endedEvent({
      hackathonId: "00000000-0000-4000-8000-000000000701",
      id: EVENT_IDS.hackathon,
    });
    const { service, state } = setup({
      events: [
        publicEvent,
        protectedEvent,
        projectsEvent,
        renamedLookalikeEvent,
        hackathonEvent,
      ],
    });

    await expect(
      service.provisionForEvent({ eventId: publicEvent.id }),
    ).resolves.toMatchObject({ rewardPoints: 5, status: "created" });
    await expect(
      service.provisionForEvent({ eventId: projectsEvent.id }),
    ).resolves.toMatchObject({ status: "created" });
    await expect(
      service.provisionForEvent({ eventId: renamedLookalikeEvent.id }),
    ).resolves.toMatchObject({ status: "created" });
    await expect(
      service.provisionForEvent({ eventId: protectedEvent.id }),
    ).resolves.toEqual({ status: "not_applicable" });
    await expect(
      service.provisionForEvent({ eventId: hackathonEvent.id }),
    ).resolves.toEqual({ status: "not_applicable" });

    expect([...state.configs.keys()]).toEqual([
      publicEvent.id,
      projectsEvent.id,
      renamedLookalikeEvent.id,
    ]);
    expect([...state.configs.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          closesAt: new Date(publicEvent.endAt.getTime() + 7 * DAY),
          eventId: publicEvent.id,
          rewardPoints: FEEDBACK_POINTS,
        }),
      ]),
    );
    expect([...state.forms.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "event_feedback", locked: true }),
      ]),
    );
  });

  it("[TC-039, TC-041] keeps an explicit one-to-one event/form link independent of event names", async () => {
    const firstEvent = endedEvent();
    const secondEvent = endedEvent({
      id: "00000000-0000-4000-8000-000000000112",
      name: firstEvent.name,
    });
    const { service, state } = setup({ events: [firstEvent, secondEvent] });

    await service.provisionForEvent({ eventId: firstEvent.id });
    await service.provisionForEvent({ eventId: secondEvent.id });
    const firstConfig = state.configs.get(firstEvent.id);
    const secondConfig = state.configs.get(secondEvent.id);
    expect(firstConfig?.formId).not.toBe(secondConfig?.formId);
    expect(firstConfig?.eventId).toBe(firstEvent.id);
    expect(secondConfig?.eventId).toBe(secondEvent.id);

    const originalSlug = state.forms.get(
      requireFeedbackConfig(state, firstEvent.id).formId,
    )?.slug;
    state.events.set(firstEvent.id, {
      ...firstEvent,
      name: "Renamed Without Relinking",
    });
    await expect(
      service.provisionForEvent({ eventId: firstEvent.id }),
    ).resolves.toMatchObject({
      formId: firstConfig?.formId,
      status: "existing",
    });
    expect(state.configs.get(firstEvent.id)?.formId).toBe(firstConfig?.formId);
    expect(
      state.forms.get(requireFeedbackConfig(state, firstEvent.id).formId)?.slug,
    ).toBe(originalSlug);
  });

  it("[TC-041] recomputes the feedback deadline from every event end-time change", async () => {
    const event = endedEvent();
    const { clock, service, state } = setup({ events: [event] });
    await service.provisionForEvent({ eventId: event.id });

    clock.set(new Date(event.endAt.getTime() + 2 * DAY));
    const movedEnd = new Date(NOW.getTime() + 3 * DAY);
    state.events.set(event.id, { ...event, endAt: movedEnd });

    await expect(
      service.recomputeWindowForEvent({ eventId: event.id }),
    ).resolves.toMatchObject({
      closesAt: new Date(movedEnd.getTime() + 7 * DAY),
    });
    expect(state.configs.get(event.id)).toMatchObject({
      closesAt: new Date(movedEnd.getTime() + 7 * DAY),
    });
  });

  it("[TC-042, TC-NEG-010] requires checked-in attendance even when the member possesses the form ID", async () => {
    const { service, state } = setup();
    await service.provisionForEvent({ eventId: EVENT_IDS.ended });
    const formId = requireFeedbackConfig(state, EVENT_IDS.ended).formId;

    await expect(
      service.submit({
        answers: validAnswers,
        formId,
        memberId: MEMBER_IDS.member,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.responses.size).toBe(0);
    expect(state.rewards.size).toBe(0);
    expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 10,
    });
  });

  it("[TC-042, TC-043] collapses repeated check-ins to one opportunity and one atomic five-point reward", async () => {
    const duplicateAttendance = [
      attendanceRecord({ eventId: EVENT_IDS.ended }),
      attendanceRecord({
        eventId: EVENT_IDS.ended,
        id: "00000000-0000-4000-8000-000000000602",
        pointsAwarded: 0,
      }),
    ];
    const { service, state } = setup({ attendance: duplicateAttendance });
    await service.provisionForEvent({ eventId: EVENT_IDS.ended });
    const formId = requireFeedbackConfig(state, EVENT_IDS.ended).formId;

    await expect(
      service.listMemberOpportunities({ memberId: MEMBER_IDS.member }),
    ).resolves.toEqual([
      expect.objectContaining({
        eventId: EVENT_IDS.ended,
        rewardPoints: FEEDBACK_POINTS,
        status: "available",
      }),
    ]);

    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.submit({
          answers: validAnswers,
          formId,
          memberId: MEMBER_IDS.member,
        }),
      ),
    );

    expect(
      outcomes.filter(({ status }) => status === "submitted"),
    ).toHaveLength(1);
    expect(
      outcomes.filter(({ status }) => status === "completed"),
    ).toHaveLength(4);
    expect(state.responses.size).toBe(1);
    expect(state.rewards.size).toBe(1);
    expect([...state.rewards.values()][0]).toMatchObject({
      amount: FEEDBACK_POINTS,
      eventId: EVENT_IDS.ended,
      memberId: MEMBER_IDS.member,
      responseId: [...state.responses.keys()][0],
    });
    expect(await state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 15,
    });
  });

  it("[TC-046] allows checked-in feedback before event end and derives urgency, expiration, and durable completion from the server clock", async () => {
    const config = feedbackConfig();
    const attendance = attendanceRecord({ eventId: EVENT_IDS.ended });
    const fixture = setup({
      attendance: [attendance],
      configs: [config],
      forms: [feedbackForm()],
    });

    fixture.clock.set(new Date(config.closesAt.getTime() - 7 * DAY - 1));
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({
      dueAt: config.closesAt,
      status: "available",
      urgent: false,
    });

    fixture.clock.set(new Date(config.closesAt.getTime() - DAY - 1));
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "available", urgent: false });

    fixture.clock.set(new Date(config.closesAt.getTime() - DAY));
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "available", urgent: false });

    fixture.clock.set(new Date(config.closesAt.getTime() - DAY + 1));
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "due_soon", urgent: true });

    fixture.clock.set(config.closesAt);
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "not_applicable", urgent: false });

    fixture.state.rewards.set(
      `${EVENT_IDS.ended}:${MEMBER_IDS.member}`,
      feedbackReward({ responseId: null }),
    );
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({
      pointsAwarded: FEEDBACK_POINTS,
      status: "completed",
      urgent: false,
    });
  });

  it("[TC-042] accepts checked-in feedback before the scheduled event end", async () => {
    const event = endedEvent({
      endAt: new Date(NOW.getTime() + DAY),
      name: "Workshop Still In Progress",
      startAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    });
    const config = feedbackConfig({
      closesAt: new Date(event.endAt.getTime() + 7 * DAY),
      eventId: event.id,
    });
    const fixture = setup({
      attendance: [attendanceRecord({ eventId: event.id })],
      configs: [config],
      events: [event],
      forms: [feedbackForm()],
    });

    await expect(
      fixture.service.submit({
        answers: validAnswers,
        formId: config.formId,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({
      pointsAwarded: FEEDBACK_POINTS,
      status: "submitted",
    });
  });

  it("[TC-044, TC-NEG-010] accepts only code-owned discovery sources and requires Other details", async () => {
    for (const discovery of FORMS.getDropdownOptionsFromConst(
      "EVENT_FEEDBACK_HEARD",
    )) {
      const approvedFixture = setup({
        attendance: [attendanceRecord({ eventId: EVENT_IDS.ended })],
        configs: [feedbackConfig()],
        forms: [feedbackForm()],
      });
      await expect(
        approvedFixture.service.submit({
          answers: {
            ...validAnswers,
            discovery,
            ...(discovery === "Other"
              ? { discoveryOther: "Flyer in HEC" }
              : {}),
          },
          formId: FORM_IDS.primary,
          memberId: MEMBER_IDS.member,
        }),
      ).resolves.toMatchObject({ status: "submitted" });
      expect(
        [...approvedFixture.state.responses.values()][0]?.answers.discovery,
      ).toBe(discovery);
    }

    const fixture = setup({
      attendance: [attendanceRecord({ eventId: EVENT_IDS.ended })],
      configs: [feedbackConfig()],
      forms: [feedbackForm()],
    });
    await expect(
      fixture.service.submit({
        answers: { ...validAnswers, discovery: "TikTok" },
        formId: FORM_IDS.primary,
        memberId: MEMBER_IDS.member,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fixture.state.responses.size).toBe(0);

    await expect(
      fixture.service.submit({
        answers: {
          ...validAnswers,
          discovery: "Google Calendar",
          discoveryOther: "stale value",
        },
        formId: FORM_IDS.primary,
        memberId: MEMBER_IDS.member,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      fixture.service.submit({
        answers: { ...validAnswers, discovery: "Other" },
        formId: FORM_IDS.primary,
        memberId: MEMBER_IDS.member,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      fixture.service.submit({
        answers: {
          ...validAnswers,
          discovery: "Other",
          discoveryOther: "  Flyer in HEC  ",
        },
        formId: FORM_IDS.primary,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "submitted" });
    expect([...fixture.state.responses.values()][0]?.answers).toMatchObject({
      discovery: "Other",
      discoveryOther: "  Flyer in HEC  ",
    });
  });

  it("[TC-052, TC-NEG-012] deletion removes answers but preserves reward, points, and the completed lock", async () => {
    const response = feedbackResponse();
    const reward = feedbackReward();
    const fixture = setup({
      attendance: [attendanceRecord({ eventId: EVENT_IDS.ended })],
      configs: [feedbackConfig()],
      forms: [feedbackForm()],
      members: [memberRecord({ points: 15 })],
      responses: [response],
      rewards: [reward],
    });

    await expect(
      fixture.service.deleteResponse({ responseId: response.id }),
    ).resolves.toEqual({ status: "deleted" });
    expect(fixture.state.responses.size).toBe(0);
    expect([...fixture.state.rewards.values()][0]).toMatchObject({
      amount: FEEDBACK_POINTS,
      responseId: null,
    });
    expect(await fixture.state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 15,
    });
    await expect(
      fixture.service.getMemberOpportunity({
        eventId: EVENT_IDS.ended,
        memberId: MEMBER_IDS.member,
      }),
    ).resolves.toMatchObject({ status: "completed" });

    const retries = await Promise.all(
      Array.from({ length: 3 }, () =>
        fixture.service.submit({
          answers: validAnswers,
          formId: FORM_IDS.primary,
          memberId: MEMBER_IDS.member,
        }),
      ),
    );
    expect(retries.every(({ status }) => status === "completed")).toBe(true);
    expect(fixture.state.responses.size).toBe(0);
    expect(fixture.state.rewards.size).toBe(1);
    expect(await fixture.state.getMember(MEMBER_IDS.member)).toMatchObject({
      points: 15,
    });
  });

  it("[TC-045, TC-049] calculates deterministic safe core and event-specific aggregates", async () => {
    const fixture = analyticsFixture();

    const analytics = await fixture.service.getAnalytics({
      access: "aggregate",
      eventId: EVENT_IDS.ended,
    });

    expect(analytics).toMatchObject({
      attendeeCount: 3,
      discovery: { Discord: 2, "Google Calendar": 1 },
      excludedCount: 0,
      includedCount: 3,
      ratings: {
        fun: {
          average: 3,
          distribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 0 },
        },
        learning: {
          average: 3,
          distribution: { 1: 1, 2: 0, 3: 1, 4: 0, 5: 1 },
        },
        overall: {
          average: 4,
          distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
        },
      },
      responseCount: 3,
      responseRate: 1,
    });
    expect(analytics.customQuestionSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          average: 4,
          prompt: "How useful was the live demo?",
          type: "linear_scale",
        }),
        expect.objectContaining({
          nonEmptyCount: 2,
          prompt: "What should the next demo cover?",
          type: "paragraph",
        }),
      ]),
    );
    expect(analytics).not.toHaveProperty("qualitativeAnswers");
    expect(analytics).not.toHaveProperty("responses");
  });

  it("[TC-050] separates event-readable aggregates from identified answers, CSV, and exclusions", async () => {
    const fixture = analyticsFixture();

    await expect(
      fixture.service.getAnalytics({
        access: "aggregate",
        eventId: EVENT_IDS.ended,
        excludedResponseIds: [RESPONSE_IDS.first],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      fixture.service.exportCsv({
        access: "aggregate",
        eventId: EVENT_IDS.ended,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const rich = await fixture.service.getAnalytics({
      access: "responses",
      eventId: EVENT_IDS.ended,
    });
    expect(rich.responses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberId: MEMBER_IDS.member,
          responseId: RESPONSE_IDS.first,
        }),
      ]),
    );
    expect(rich.qualitativeAnswers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "worked",
          responseId: RESPONSE_IDS.first,
          value: "The live examples.",
        }),
        expect.objectContaining({
          field: "improve",
          responseId: RESPONSE_IDS.second,
          value: "More practice time.",
        }),
      ]),
    );
    const csv = await fixture.service.exportCsv({
      access: "responses",
      eventId: EVENT_IDS.ended,
    });
    expect(csv).toContain(MEMBER_IDS.member);
    expect(csv.split("\n")[0]).toBe(
      '"Response UUID","Member UUID","Submitted At","Overall","Fun","Learning","Discovery","Discovery Other","Worked","Improve","How useful was the live demo?","What should the next demo cover?"',
    );
    expect(csv).toContain('"5","\'=SUM(1,2)"');
    expect(csv).toContain('"3","Deployment"');
  });

  it("[TC-051] applies exclusions only to the current rich inspection, never list metrics, CSV, or stored responses", async () => {
    const fixture = analyticsFixture();
    const before = structuredClone([...fixture.state.responses.values()]);
    const listBefore = await fixture.service.getEventListMetric({
      eventId: EVENT_IDS.ended,
    });

    const local = await fixture.service.getAnalytics({
      access: "responses",
      eventId: EVENT_IDS.ended,
      excludedResponseIds: [RESPONSE_IDS.first],
    });
    expect(local).toMatchObject({
      excludedCount: 1,
      includedCount: 2,
      ratings: { overall: { average: 3.5 } },
    });
    expect(local.responses.map(({ responseId }) => responseId)).not.toContain(
      RESPONSE_IDS.first,
    );

    const freshInspection = await fixture.service.getAnalytics({
      access: "responses",
      eventId: EVENT_IDS.ended,
    });
    expect(freshInspection).toMatchObject({
      excludedCount: 0,
      includedCount: 3,
      ratings: { overall: { average: 4 } },
    });
    expect(
      await fixture.service.getEventListMetric({ eventId: EVENT_IDS.ended }),
    ).toEqual(listBefore);
    const csv = await fixture.service.exportCsv({
      access: "responses",
      eventId: EVENT_IDS.ended,
    });
    expect(csv).toContain(RESPONSE_IDS.first);
    expect(csv).toContain(RESPONSE_IDS.second);
    expect(csv).toContain(RESPONSE_IDS.third);
    expect([...fixture.state.responses.values()]).toEqual(before);
  });
});

function analyticsFixture() {
  const secondMember = memberRecord({
    email: "other@example.test",
    firstName: "Member",
    id: MEMBER_IDS.other,
    lastName: "Two",
    userId: "00000000-0000-4000-8000-000000000303",
  });
  const thirdMember = memberRecord({
    email: "third@example.test",
    firstName: "Member",
    id: EXTRA_MEMBER_ID,
    lastName: "Three",
    userId: EXTRA_USER_ID,
  });
  const responses = [
    feedbackResponse({
      answers: {
        ...validAnswers,
        customAnswers: {
          [CUSTOM_QUESTION_IDS.rating]: 5,
          [CUSTOM_QUESTION_IDS.text]: "=SUM(1,2)",
        },
      },
    }),
    feedbackResponse({
      answers: {
        customAnswers: {
          [CUSTOM_QUESTION_IDS.rating]: 3,
          [CUSTOM_QUESTION_IDS.text]: "Deployment",
        },
        discovery: "Google Calendar",
        fun: 2,
        improve: "More practice time.",
        learning: 1,
        overall: 3,
        worked: "",
      },
      id: RESPONSE_IDS.second,
      memberId: MEMBER_IDS.other,
    }),
    feedbackResponse({
      answers: {
        discovery: "Discord",
        fun: 3,
        improve: "",
        learning: 5,
        overall: 4,
        worked: "Mentor support.",
      },
      id: RESPONSE_IDS.third,
      memberId: EXTRA_MEMBER_ID,
    }),
  ];
  return setup({
    attendance: [
      attendanceRecord({ eventId: EVENT_IDS.ended }),
      attendanceRecord({
        eventId: EVENT_IDS.ended,
        id: "00000000-0000-4000-8000-000000000602",
        pointsAwarded: 0,
      }),
      attendanceRecord({
        eventId: EVENT_IDS.ended,
        id: "00000000-0000-4000-8000-000000000603",
        memberId: MEMBER_IDS.other,
      }),
      attendanceRecord({
        eventId: EVENT_IDS.ended,
        id: "00000000-0000-4000-8000-000000000604",
        memberId: EXTRA_MEMBER_ID,
      }),
    ],
    configs: [
      feedbackConfig({
        customQuestions: [
          {
            id: CUSTOM_QUESTION_IDS.rating,
            prompt: "How useful was the live demo?",
            type: "linear_scale",
          },
          {
            id: CUSTOM_QUESTION_IDS.text,
            prompt: "What should the next demo cover?",
            type: "paragraph",
          },
        ],
      }),
    ],
    forms: [feedbackForm()],
    members: [memberRecord(), secondMember, thirdMember],
    responses,
  });
}
