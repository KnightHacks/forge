import { describe, expect, it } from "vitest";

import {
  printJobCategoryReminderEmail,
  printJobStatusEmail,
} from "../print-job";

const base = {
  categoryLabel: "Hackathon project",
  description: "A <bracket> & robot arm",
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
    expect(mail.text).toContain("Organizer estimate: 3:40 PM");
    expect(mail.text).toContain(
      "https://khix.knighthacks.org/dashboard/printing",
    );
    expect(mail.html).toContain(
      "https://assets.knighthacks.org/khix/og-image.webp",
    );
    expect(mail.html).toContain("A &lt;bracket&gt; &amp; robot arm");
    expect(mail.text).toContain("Category: Hackathon project");
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

it("renders a category reminder in the IX design without promising a duration", () => {
  const mail = printJobCategoryReminderEmail({ ...base, jobCount: 2 });
  expect(mail.html).toContain(
    "https://assets.knighthacks.org/khix/og-image.webp",
  );
  expect(mail.text).toContain("2 waiting print requests");
  expect(mail.text).toContain("Hackathon project or Personal print");
  expect(mail.text).toContain("even while new submissions are closed");
  expect(mail.text).not.toMatch(/1 hour|60 min|Estimated ready/);
  expect(mail.html).toContain(
    'href="https://khix.knighthacks.org/dashboard/printing"',
  );
});
it("keeps other hackathons free of IX event artwork", () => {
  expect(
    printJobStatusEmail({ ...base, hackathonName: "Another Hack" }).html,
  ).not.toContain("/khix/");
});
