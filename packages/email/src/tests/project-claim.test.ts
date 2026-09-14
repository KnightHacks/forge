import { describe, expect, it } from "vitest";

import { projectClaimEmail } from "../project-claim";

describe("project claim email", () => {
  it("escapes imported names and keeps the claim action in HTML and text", () => {
    const mail = projectClaimEmail({
      project: '<img src=x onerror="bad()">',
      name: "A&B",
      url: "https://hack.example/claim?token=123",
      invited: false,
    });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("A&amp;B");
    expect(mail.html).toContain('href="https://hack.example/claim?token=123"');
    expect(mail.text).toContain("https://hack.example/claim?token=123");
    expect(mail.subject).toContain("Knight Hacks: Claim");
    expect(mail.html).toContain("for a Knight Hacks hackathon");
  });
});
