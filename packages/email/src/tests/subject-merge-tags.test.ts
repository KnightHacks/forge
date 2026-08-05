import { describe, expect, it } from "vitest";

import { compileSubjectForProvider } from "../templates";

/**
 * Subject lines are plain strings, not template nodes, so the compiler that
 * handles the body never touched them.
 *
 * The hackathon configuration screen advertises `{{hackathon.displayName}}` in
 * its subject examples, and those reached Listmonk verbatim — Go rejected the
 * campaign with `function "hacker" not defined`, the campaign was created but
 * could never start, and the send sat at "running" having mailed nobody. Silent,
 * because nothing in Blade surfaces a provider compile error.
 */
describe("compileSubjectForProvider", () => {
  const sendId = "11111111-2222-3333-4444-555555555555";

  it("rewrites a merge tag into the provider's attribute accessor", () => {
    expect(
      compileSubjectForProvider("Hi {{recipient.firstName}}", sendId),
    ).toBe(
      `Hi {{ (index .Subscriber.Attribs "forge" "${sendId}" "recipient" "firstName") }}`,
    );
  });

  it("handles the subject the hackathon screen actually ships", () => {
    const compiled = compileSubjectForProvider(
      "You have been moved to {{hacker.status}} for {{hackathon.displayName}}",
      sendId,
    );

    // Neither tag may survive: one uncompiled tag fails the whole campaign.
    expect(compiled).not.toContain("{{hacker.status}}");
    expect(compiled).not.toContain("{{hackathon.displayName}}");
    expect(compiled).toContain('"hacker" "status"');
    expect(compiled).toContain('"hackathon" "displayName"');
  });

  it("tolerates whitespace inside the braces", () => {
    expect(
      compileSubjectForProvider("{{  hacker.status  }}", sendId),
    ).toContain('"hacker" "status"');
  });

  it("leaves a subject without tags exactly as written", () => {
    expect(compileSubjectForProvider("Welcome to Knight Hacks", sendId)).toBe(
      "Welcome to Knight Hacks",
    );
  });
});
