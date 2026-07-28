import { describe, expect, it } from "vitest";

import { callbackConfigurationSchema } from "@forge/validators";

import { callbackInputMappings } from "~/app/_components/admin/forms/form-callback-mappings";

describe("form callback mappings", () => {
  it("always identifies the responding member", () => {
    const [member] = callbackInputMappings({
      questionId: "",
      slug: "recruiting.notify",
      value: "",
    });

    expect(member).toEqual({
      inputKey: "memberId",
      source: { kind: "system", value: "member_id" },
    });
  });

  it("sends the typed role id when assigning a Discord role", () => {
    const mappings = callbackInputMappings({
      questionId: "0f1c9c4e-1f4a-4d5a-9c1e-2f3a4b5c6d7e",
      slug: "discord.assign-role",
      value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    });

    expect(mappings[1]).toEqual({
      inputKey: "roleId",
      source: { kind: "fixed", value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" },
    });
  });

  it("pulls a recruiting note from the chosen question", () => {
    const mappings = callbackInputMappings({
      questionId: "0f1c9c4e-1f4a-4d5a-9c1e-2f3a4b5c6d7e",
      slug: "recruiting.notify",
      value: "ignored once a question is chosen",
    });

    expect(mappings[1]).toEqual({
      inputKey: "note",
      source: {
        kind: "question",
        questionId: "0f1c9c4e-1f4a-4d5a-9c1e-2f3a4b5c6d7e",
      },
    });
  });

  it("falls back to the typed note when no question is chosen", () => {
    const mappings = callbackInputMappings({
      questionId: "",
      slug: "recruiting.notify",
      value: "Reach out about the internship",
    });

    expect(mappings[1]).toEqual({
      inputKey: "note",
      source: { kind: "fixed", value: "Reach out about the internship" },
    });
  });

  // `forms.configureCallback` takes `z.array(z.unknown())` and validates on the
  // server, so a client-side shape change would have reached the API before
  // anything rejected it.
  it("produces mappings the stored configuration accepts", () => {
    const parsed = callbackConfigurationSchema.safeParse({
      callbackSlug: "discord.assign-role",
      mappings: callbackInputMappings({
        questionId: "",
        slug: "discord.assign-role",
        value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      }),
      responseMode: "single_locked",
    });

    expect(parsed.success).toBe(true);
  });
});
