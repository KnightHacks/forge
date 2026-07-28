import { describe, expect, it } from "vitest";

import {
  compareRecipientsByFirstName,
  visibleRecipients,
} from "~/app/_components/admin/email/email-recipient-list";

const recipient = (name: string, email: string) => ({ email, name });

const emailsOf = (list: { email: string }[]) => list.map(({ email }) => email);

describe("compareRecipientsByFirstName", () => {
  it("orders by first name rather than by the full name", () => {
    const sorted = [
      recipient("Zoe Adams", "zoe@knighthacks.org"),
      recipient("Adam Zimmerman", "adam@knighthacks.org"),
    ].sort(compareRecipientsByFirstName);
    expect(emailsOf(sorted)).toEqual([
      "adam@knighthacks.org",
      "zoe@knighthacks.org",
    ]);
  });

  it("ignores case and accents when comparing", () => {
    const sorted = [
      recipient("bea", "b@knighthacks.org"),
      recipient("Ana", "a@knighthacks.org"),
      recipient("Ána", "accent@knighthacks.org"),
    ].sort(compareRecipientsByFirstName);
    expect(sorted[0]?.name).toMatch(/na$/i);
    expect(sorted[2]?.name).toBe("bea");
  });

  it("falls back to the email when a recipient has no name", () => {
    const sorted = [
      recipient("Mia Chen", "mia@knighthacks.org"),
      recipient("", "aaron@knighthacks.org"),
    ].sort(compareRecipientsByFirstName);
    expect(emailsOf(sorted)).toEqual([
      "aaron@knighthacks.org",
      "mia@knighthacks.org",
    ]);
  });

  it("breaks a shared first name on the full name, then on the email", () => {
    const sorted = [
      recipient("Sam Wilson", "sam.w@knighthacks.org"),
      recipient("Sam Wilson", "sam.a@knighthacks.org"),
      recipient("Sam Baker", "sam.b@knighthacks.org"),
    ].sort(compareRecipientsByFirstName);
    expect(emailsOf(sorted)).toEqual([
      "sam.b@knighthacks.org",
      "sam.a@knighthacks.org",
      "sam.w@knighthacks.org",
    ]);
  });

  it("sorts numbered names the way a human reads them", () => {
    const sorted = [
      recipient("Team 10", "ten@knighthacks.org"),
      recipient("Team 2", "two@knighthacks.org"),
    ].sort(compareRecipientsByFirstName);
    expect(emailsOf(sorted)).toEqual([
      "two@knighthacks.org",
      "ten@knighthacks.org",
    ]);
  });
});

describe("visibleRecipients", () => {
  const pool = [
    recipient("Zoe Adams", "zoe@knighthacks.org"),
    recipient("Adam Zimmerman", "adam@ucf.edu"),
    recipient("", "nameless@knighthacks.org"),
  ];

  it("keeps every recipient when the search is empty or whitespace", () => {
    expect(emailsOf(visibleRecipients(pool, ""))).toEqual([
      "adam@ucf.edu",
      "nameless@knighthacks.org",
      "zoe@knighthacks.org",
    ]);
    expect(visibleRecipients(pool, "   ")).toHaveLength(3);
  });

  it("matches names and emails case-insensitively", () => {
    // Matches the surname only, so this is a name match and not an email one.
    expect(emailsOf(visibleRecipients(pool, "ADAMS"))).toEqual([
      "zoe@knighthacks.org",
    ]);
    // Matches the domain only, so this is an email match and not a name one.
    expect(emailsOf(visibleRecipients(pool, "UCF.EDU"))).toEqual([
      "adam@ucf.edu",
    ]);
  });

  it("returns the matches sorted, not in pool order", () => {
    expect(emailsOf(visibleRecipients(pool, "knighthacks"))).toEqual([
      "nameless@knighthacks.org",
      "zoe@knighthacks.org",
    ]);
  });

  it("returns nothing when nothing matches", () => {
    expect(visibleRecipients(pool, "nobody")).toEqual([]);
  });

  it("does not reorder the array it was given", () => {
    const source = [...pool];
    visibleRecipients(source, "");
    expect(emailsOf(source)).toEqual(emailsOf(pool));
  });

  it("preserves the extra fields the audience resolution carries", () => {
    const resolved = [
      {
        attributes: { school: "UCF" },
        email: "zoe@knighthacks.org",
        matchReasons: ["current_members"],
        name: "Zoe Adams",
      },
    ];
    expect(visibleRecipients(resolved, "zoe")[0]?.matchReasons).toEqual([
      "current_members",
    ]);
  });
});
