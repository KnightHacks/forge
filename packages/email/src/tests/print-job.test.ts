import { describe, expect, it } from "vitest";

import { printJobStatusEmail } from "../print-job";

const base = {
  hackathonName: "Knight Hacks IX",
  headline: "We need a quick answer.",
  name: "A&B",
  note: '<script>alert("x")</script> Which color?',
  portalUrl: "https://khix.knighthacks.org/dashboard/printing",
  readyAt: "3:40 PM",
  statusLabel: "Needs clarification",
};

describe("print job status email", () => {
  it("[TC-007] escapes hacker and organizer text and links the tracker", () => {
    const mail = printJobStatusEmail(base);

    expect(mail.subject).toBe(
      "Knight Hacks IX 3D printing: Needs clarification",
    );
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("A&amp;B");
    expect(mail.html).toContain(
      'href="https://khix.knighthacks.org/dashboard/printing"',
    );
    expect(mail.text).toContain("Note from the organizers:");
    expect(mail.text).toContain("Estimated ready: about 3:40 PM");
    expect(mail.text).toContain("Track your print: https://khix");
  });

  it("leaves out the note, estimate, and link when there are none", () => {
    const mail = printJobStatusEmail({
      ...base,
      note: null,
      portalUrl: null,
      readyAt: null,
    });

    expect(mail.html).not.toContain("NOTE FROM THE ORGANIZERS");
    expect(mail.html).not.toContain("Track your print");
    expect(mail.text).not.toContain("Estimated ready");
  });
});
