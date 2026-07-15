import { describe, expect, it } from "vitest";

import {
  applyFormDefinitionMutation,
  transitionFormState,
} from "../../utils/forms/definitions";

const FORM_ID = "00000000-0000-4000-8000-000000000301";
const FIRST_QUESTION_ID = "10000000-0000-4000-8000-000000000301";
const SECOND_QUESTION_ID = "10000000-0000-4000-8000-000000000302";
const NOW = new Date("2026-07-15T18:00:00.000Z");

function form(
  overrides: Partial<{
    archivedAt: Date | null;
    definition: {
      description: string;
      instructions: unknown[];
      questions: Record<string, unknown>[];
      title: string;
    };
    publishedAt: Date | null;
    revision: number;
    slug: string;
    state: "archived" | "draft" | "published";
  }> = {},
) {
  return {
    archivedAt: null,
    definition: {
      description: "Apply to join the team.",
      instructions: [],
      questions: [
        {
          id: FIRST_QUESTION_ID,
          maxLength: 120,
          prompt: "Why are you interested?",
          required: true,
          retired: false,
          type: "short_text",
        },
        {
          id: SECOND_QUESTION_ID,
          max: 5,
          min: 1,
          prompt: "How excited are you?",
          required: true,
          retired: false,
          type: "linear_scale",
        },
      ],
      title: "Team applications",
    },
    id: FORM_ID,
    publishedAt: null,
    revision: 1,
    slug: "team-applications",
    state: "draft" as const,
    ...overrides,
  };
}

describe("form definition mutations", () => {
  it("[TC-008] permits a draft slug customization and freezes it after first publication", () => {
    const renamedDraft = applyFormDefinitionMutation({
      answeredQuestionIds: [],
      callbackMappedQuestionIds: [],
      current: form(),
      expectedRevision: 1,
      now: NOW,
      patch: { slug: "join-design" },
    });
    expect(renamedDraft).toMatchObject({ revision: 2, slug: "join-design" });

    const published = transitionFormState({
      current: renamedDraft,
      expectedRevision: 2,
      now: NOW,
      targetState: "published",
    });
    const retitled = applyFormDefinitionMutation({
      answeredQuestionIds: [],
      callbackMappedQuestionIds: [],
      current: published,
      expectedRevision: 3,
      now: new Date("2026-07-15T19:00:00.000Z"),
      patch: {
        definition: {
          ...published.definition,
          title: "Design team applications",
        },
      },
    });

    expect(retitled).toMatchObject({
      publishedAt: NOW,
      revision: 4,
      slug: "join-design",
      state: "published",
    });
    expect(() =>
      applyFormDefinitionMutation({
        answeredQuestionIds: [],
        callbackMappedQuestionIds: [],
        current: retitled,
        expectedRevision: 4,
        now: NOW,
        patch: { slug: "changed-after-publish" },
      }),
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));
  });

  it("[TC-006] supports only Draft -> Published <-> Archived and never clears first publication", () => {
    const published = transitionFormState({
      current: form(),
      expectedRevision: 1,
      now: NOW,
      targetState: "published",
    });
    const archivedAt = new Date("2026-07-16T18:00:00.000Z");
    const archived = transitionFormState({
      current: published,
      expectedRevision: 2,
      now: archivedAt,
      targetState: "archived",
    });
    const republished = transitionFormState({
      current: archived,
      expectedRevision: 3,
      now: new Date("2026-07-17T18:00:00.000Z"),
      targetState: "published",
    });

    expect(archived).toMatchObject({ archivedAt, revision: 3 });
    expect(republished).toMatchObject({
      archivedAt: null,
      publishedAt: NOW,
      revision: 4,
      state: "published",
    });
    expect(() =>
      transitionFormState({
        current: republished,
        expectedRevision: 4,
        now: NOW,
        targetState: "draft",
      }),
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));
  });

  it("[TC-010, TC-011] permits safe published copy/order/add/retire edits and advances one revision", () => {
    const current = form({
      publishedAt: NOW,
      revision: 7,
      state: "published",
    });
    const addedId = "10000000-0000-4000-8000-000000000303";
    const [first, second] = current.definition.questions;
    const updated = applyFormDefinitionMutation({
      answeredQuestionIds: [FIRST_QUESTION_ID],
      callbackMappedQuestionIds: [],
      current,
      expectedRevision: 7,
      now: NOW,
      patch: {
        definition: {
          ...current.definition,
          questions: [
            { ...second, prompt: "Excitement from 1 to 5" },
            { ...first, prompt: "Why Design?", retired: true },
            {
              id: addedId,
              maxLength: 2_000,
              prompt: "Anything else?",
              required: false,
              retired: false,
              type: "paragraph",
            },
          ],
          title: "Design team applications",
        },
      },
    });

    expect(updated.revision).toBe(8);
    expect(updated.definition.questions.map(({ id }) => id)).toEqual([
      SECOND_QUESTION_ID,
      FIRST_QUESTION_ID,
      addedId,
    ]);
    expect(updated.definition.questions[1]).toMatchObject({
      id: FIRST_QUESTION_ID,
      prompt: "Why Design?",
      retired: true,
      type: "short_text",
    });
  });

  it("[TC-NEG-003] rejects stale revisions, answered type changes, and mapped retirement", () => {
    const current = form({ publishedAt: NOW, state: "published" });
    const [first, second] = current.definition.questions;

    expect(() =>
      applyFormDefinitionMutation({
        answeredQuestionIds: [],
        callbackMappedQuestionIds: [],
        current,
        expectedRevision: 0,
        now: NOW,
        patch: { definition: { ...current.definition, title: "Stale" } },
      }),
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));

    expect(() =>
      applyFormDefinitionMutation({
        answeredQuestionIds: [FIRST_QUESTION_ID],
        callbackMappedQuestionIds: [],
        current,
        expectedRevision: 1,
        now: NOW,
        patch: {
          definition: {
            ...current.definition,
            questions: [
              {
                ...first,
                max: 5,
                min: 1,
                type: "linear_scale",
              },
              second,
            ],
          },
        },
      }),
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));

    expect(() =>
      applyFormDefinitionMutation({
        answeredQuestionIds: [],
        callbackMappedQuestionIds: [FIRST_QUESTION_ID],
        current,
        expectedRevision: 1,
        now: NOW,
        patch: {
          definition: {
            ...current.definition,
            questions: [{ ...first, retired: true }, second],
          },
        },
      }),
    ).toThrow(expect.objectContaining({ code: "CONFLICT" }));
  });
});
