import { describe, expect, it, vi } from "vitest";

import {
  buildMemberFormHistory,
  createFormResponseSubmissionService,
  evaluateFormRespondentState,
  planFormResponseDeletion,
  toMemberFormResponseDto,
} from "../../utils/forms/responses";

const FORM_ID = "00000000-0000-4000-8000-000000000401";
const USER_ID = "10000000-0000-4000-8000-000000000401";
const MEMBER_ID = "20000000-0000-4000-8000-000000000401";
const ROLE_ID = "30000000-0000-4000-8000-000000000401";
const NOW = new Date("2026-07-15T18:00:00.000Z");

function context(
  overrides: Partial<{
    closesAt: Date | null;
    duesPaid: boolean;
    kind: "event_feedback" | "general" | "system";
    manuallyClosed: boolean;
    opensAt: Date | null;
    respondentDuesRequired: boolean;
    respondentRoleIds: string[];
    responseMode: "multiple_locked" | "single_editable" | "single_locked";
    roleIds: string[];
    state: "archived" | "draft" | "published";
  }> = {},
) {
  return {
    actor: {
      duesPaid: overrides.duesPaid ?? false,
      memberId: MEMBER_ID,
      roleIds: overrides.roleIds ?? [],
      userId: USER_ID,
    },
    form: {
      closesAt:
        "closesAt" in overrides
          ? (overrides.closesAt ?? null)
          : new Date("2026-07-16T18:00:00.000Z"),
      id: FORM_ID,
      kind: overrides.kind ?? "general",
      manuallyClosed: overrides.manuallyClosed ?? false,
      opensAt:
        "opensAt" in overrides
          ? (overrides.opensAt ?? null)
          : new Date("2026-07-14T18:00:00.000Z"),
      respondentDuesRequired: overrides.respondentDuesRequired ?? false,
      respondentRoleIds: overrides.respondentRoleIds ?? [],
      responseMode: overrides.responseMode ?? "single_locked",
      state: overrides.state ?? "published",
    },
  };
}

describe("form respondent policy", () => {
  it("[TC-019, TC-020] enforces publication, schedule, manual close, dues, and roles from a direct link", () => {
    expect(evaluateFormRespondentState(context(), NOW)).toBe("open");
    expect(
      evaluateFormRespondentState(
        context({ opensAt: new Date("2026-07-16T18:00:00.000Z") }),
        NOW,
      ),
    ).toBe("scheduled");
    expect(
      evaluateFormRespondentState(
        context({ closesAt: new Date("2026-07-14T18:00:00.000Z") }),
        NOW,
      ),
    ).toBe("closed");
    expect(
      evaluateFormRespondentState(context({ manuallyClosed: true }), NOW),
    ).toBe("manually_closed");
    expect(
      evaluateFormRespondentState(context({ state: "archived" }), NOW),
    ).toBe("archived");
    expect(
      evaluateFormRespondentState(
        context({ respondentDuesRequired: true }),
        NOW,
      ),
    ).toBe("ineligible");
    expect(
      evaluateFormRespondentState(
        context({ respondentRoleIds: [ROLE_ID], roleIds: [ROLE_ID] }),
        NOW,
      ),
    ).toBe("open");
    expect(
      evaluateFormRespondentState(
        context({ respondentRoleIds: [ROLE_ID] }),
        NOW,
      ),
    ).toBe("ineligible");
  });

  it("[TC-017, TC-018] atomically admits one single response while multiple mode admits each submission", async () => {
    const rows: { id: string; formId: string; userId: string }[] = [];
    let nextId = 0;
    const repository = {
      createMultipleResponse: vi.fn(
        ({ formId, userId }: { formId: string; userId: string }) => {
          const response = {
            id: `multiple-${++nextId}`,
            formId,
            userId,
          };
          rows.push(response);
          return Promise.resolve(response);
        },
      ),
      createSingleResponse: vi.fn(
        ({ formId, userId }: { formId: string; userId: string }) => {
          if (
            rows.some((row) => row.formId === formId && row.userId === userId)
          )
            return Promise.resolve({ created: false as const });
          const response = { id: `single-${++nextId}`, formId, userId };
          rows.push(response);
          return Promise.resolve({ created: true as const, response });
        },
      ),
    };
    const service = createFormResponseSubmissionService({
      clock: () => NOW,
      repository,
    });

    const singleResults = await Promise.allSettled([
      service.submit({
        answers: {},
        context: context(),
        formId: FORM_ID,
        userId: USER_ID,
      }),
      service.submit({
        answers: {},
        context: context(),
        formId: FORM_ID,
        userId: USER_ID,
      }),
    ]);
    expect(
      singleResults.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      singleResults.filter(({ status }) => status === "rejected"),
    ).toHaveLength(1);
    expect(rows).toHaveLength(1);

    rows.length = 0;
    await Promise.all([
      service.submit({
        answers: {},
        context: context({ responseMode: "multiple_locked" }),
        formId: FORM_ID,
        userId: USER_ID,
      }),
      service.submit({
        answers: {},
        context: context({ responseMode: "multiple_locked" }),
        formId: FORM_ID,
        userId: USER_ID,
      }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it("[TC-017] allows updates only for an open single-editable response", async () => {
    const updateSingleResponse = vi
      .fn()
      .mockResolvedValue({ id: "response-1" });
    const service = createFormResponseSubmissionService({
      clock: () => NOW,
      repository: {
        createMultipleResponse: vi.fn(),
        createSingleResponse: vi.fn(),
        updateSingleResponse,
      },
    });

    await expect(
      service.update({
        answers: {},
        context: context({ responseMode: "single_editable" }),
        formId: FORM_ID,
        responseId: "response-1",
        userId: USER_ID,
      }),
    ).resolves.toMatchObject({ id: "response-1" });

    for (const responseContext of [
      context({ responseMode: "single_locked" }),
      context({ responseMode: "multiple_locked" }),
      context({ manuallyClosed: true, responseMode: "single_editable" }),
    ]) {
      await expect(
        service.update({
          answers: {},
          context: responseContext,
          formId: FORM_ID,
          responseId: "response-1",
          userId: USER_ID,
        }),
      ).rejects.toMatchObject({
        // Vitest's asymmetric matcher is intentionally dynamic here.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        code: expect.stringMatching(/CONFLICT|FORBIDDEN/),
      });
    }
    expect(updateSingleResponse).toHaveBeenCalledTimes(1);
  });
});

describe("member response history and privacy", () => {
  it("[TC-021, TC-022, TC-047] lists every owned generic submission without becoming form discovery", () => {
    const history = buildMemberFormHistory({
      responses: [
        {
          form: { id: "general", kind: "general", title: "Applications" },
          id: "response-older",
          submittedAt: new Date("2026-07-14T18:00:00.000Z"),
          userId: USER_ID,
        },
        {
          form: { id: "general", kind: "general", title: "Applications" },
          id: "response-newer",
          submittedAt: NOW,
          userId: USER_ID,
        },
        {
          form: { id: "feedback", kind: "event_feedback", title: "Feedback" },
          id: "feedback-response",
          submittedAt: NOW,
          userId: USER_ID,
        },
        {
          form: { id: "system", kind: "system", title: "Member signup" },
          id: "signup-response",
          submittedAt: NOW,
          userId: USER_ID,
        },
      ],
      userId: USER_ID,
    });

    expect(history.map(({ id }) => id)).toEqual([
      "response-newer",
      "response-older",
    ]);
  });

  it("[TC-036] returns a member-safe DTO with no callback, section, or admin secrets", () => {
    const dto = toMemberFormResponseDto({
      answers: { question: "answer" },
      callbackConfigurations: [{ callbackSlug: "discord.assign-role" }],
      callbackExecutions: [
        { error: "provider token leaked", status: "failed" },
      ],
      form: {
        id: FORM_ID,
        kind: "general",
        sectionId: "private-section",
        title: "Applications",
      },
      id: "response-1",
      respondentSnapshot: { questions: [] },
      sectionPolicy: { editorRoleIds: [ROLE_ID] },
      submittedAt: NOW,
      userId: USER_ID,
    });

    expect(dto).toEqual({
      answers: { question: "answer" },
      form: { id: FORM_ID, kind: "general", title: "Applications" },
      id: "response-1",
      respondentSnapshot: { questions: [] },
      submittedAt: NOW,
    });
    const serialized = JSON.stringify(dto);
    for (const secret of [
      "callback",
      "provider token leaked",
      "private-section",
      ROLE_ID,
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});

describe("form response deletion", () => {
  it("[TC-028, TC-037, TC-NEG-009] removes files, cancels pending work, retains terminal audit, and plans no compensation", () => {
    const plan = planFormResponseDeletion({
      attachmentIds: ["attachment-1", "attachment-2"],
      callbackExecutions: [
        { callbackSlug: "one", id: "pending", status: "pending" },
        { callbackSlug: "two", id: "failed", status: "failed" },
        { callbackSlug: "three", id: "succeeded", status: "succeeded" },
      ],
      responseId: "response-1",
    });

    expect(plan).toEqual({
      automaticCompensations: [],
      cancelExecutionIds: ["pending"],
      deleteAttachmentIds: ["attachment-1", "attachment-2"],
      retainedExecutionAudit: [
        {
          callbackSlug: "two",
          id: "failed",
          responseId: null,
          status: "failed",
        },
        {
          callbackSlug: "three",
          id: "succeeded",
          responseId: null,
          status: "succeeded",
        },
      ],
      responseId: "response-1",
    });
  });
});
