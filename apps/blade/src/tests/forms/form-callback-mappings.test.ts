import { describe, expect, it } from "vitest";

import { callbackConfigurationSchema } from "@forge/validators";

import type { CallbackCatalogItem } from "~/app/_components/admin/forms/form-builder-types";
import {
  callbackInputMappings,
  emptyCallbackDraft,
  isCallbackDraftComplete,
  savedCallbackDraft,
} from "~/app/_components/admin/forms/form-callback-mappings";

const recruiting: CallbackCatalogItem = {
  available: true,
  description: "Notify recruiting",
  inputs: [
    {
      allowedSources: ["question", "respondent", "fixed"],
      fixedInputType: "text",
      key: "name",
      label: "Name",
      respondentValues: ["respondent_name"],
    },
    {
      allowedSources: ["question", "fixed"],
      fixedInputType: "text",
      key: "team",
      label: "Team",
    },
  ],
  label: "Notify recruiting",
  requiredPermission: "EDIT_FORMS",
  slug: "recruiting.notify",
};

describe("form callback mappings", () => {
  it("defaults semantic respondent fields and leaves question mappings explicit", () => {
    expect(emptyCallbackDraft(recruiting)).toEqual({
      mappings: {
        name: { kind: "respondent", value: "respondent_name" },
        team: { kind: "question", questionId: "" },
      },
      slug: "recruiting.notify",
    });
  });

  it("serializes every procedure input without callback-specific branches", () => {
    const mappings = callbackInputMappings({
      mappings: {
        name: { kind: "respondent", value: "respondent_name" },
        team: { kind: "fixed", value: "Outreach" },
      },
      slug: "recruiting.notify",
    });

    expect(mappings).toEqual([
      {
        inputKey: "name",
        source: { kind: "respondent", value: "respondent_name" },
      },
      { inputKey: "team", source: { kind: "fixed", value: "Outreach" } },
    ]);
  });

  it("restores saved question, respondent, and manual mappings", () => {
    expect(
      savedCallbackDraft(
        {
          active: true,
          callbackSlug: "recruiting.notify",
          id: "callback-1",
          mappings: [
            {
              inputKey: "name",
              source: { kind: "respondent", value: "respondent_name" },
            },
            {
              inputKey: "team",
              source: { kind: "fixed", value: "Development" },
            },
          ],
        },
        recruiting,
      ),
    ).toEqual({
      mappings: {
        name: { kind: "respondent", value: "respondent_name" },
        team: { kind: "fixed", value: "Development" },
      },
      slug: "recruiting.notify",
    });
  });

  it("marks legacy mappings invalid until an admin replaces them", () => {
    const draft = savedCallbackDraft(
      {
        active: true,
        callbackSlug: "recruiting.notify",
        id: "callback-1",
        mappings: [
          {
            inputKey: "name",
            source: { kind: "note", value: "legacy" },
          },
        ],
      },
      recruiting,
    );

    expect(draft.invalidSavedMappings).toBe(true);
    expect(isCallbackDraftComplete(draft)).toBe(false);
  });

  it("requires a selected question or non-empty manual value", () => {
    expect(isCallbackDraftComplete(emptyCallbackDraft(recruiting))).toBe(false);
    expect(
      isCallbackDraftComplete({
        mappings: {
          name: { kind: "respondent", value: "respondent_name" },
          team: { kind: "fixed", value: "Outreach" },
        },
        slug: "recruiting.notify",
      }),
    ).toBe(true);
  });

  it("produces mappings the stored configuration accepts", () => {
    const parsed = callbackConfigurationSchema.safeParse({
      callbackSlug: "recruiting.notify",
      mappings: callbackInputMappings({
        mappings: {
          name: { kind: "respondent", value: "respondent_name" },
          team: { kind: "fixed", value: "Outreach" },
        },
        slug: "recruiting.notify",
      }),
      responseMode: "single_locked",
    });

    expect(parsed.success).toBe(true);
  });
});
