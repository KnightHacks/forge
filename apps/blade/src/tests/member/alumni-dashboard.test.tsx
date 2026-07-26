import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AlumniDashboard } from "~/app/_components/member/alumni-dashboard";

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: Record<string, unknown>) =>
    createElement("img", props),
}));
vi.mock("~/app/_components/member/member-qr-code-dialog", () => ({
  MemberQRCodeDialog: () => createElement("button", null, "QR code"),
}));

const dashboard = {
  bulletin: [
    {
      body: "Knight Hacks needs alumni volunteers for our fall workshops.",
      ctaLabel: "Volunteer",
      externalUrl: "https://knighthacks.org/volunteer",
      formId: null,
      id: "00000000-0000-4000-8000-000000000801",
      imageAlt: null,
      imageUrl: null,
      title: "Give the next generation a hand",
    },
  ],
  career: {
    currentEmployer: "AMD",
    currentTitle: "Software Engineer",
    historyCount: 3,
  },
  officers: [
    {
      discordUserId: "president-discord",
      email: "president@knighthacks.org",
      name: "Parker President",
      office: "President",
      profilePictureUrl: null,
      userId: "00000000-0000-4000-8000-000000000802",
    },
  ],
  recap: {
    classOf: 2025,
    clubEventCount: 12,
    lifetimePoints: 180,
    memberSince: 2022,
    mostActiveSemester: "Fall 2023",
  },
};

describe("AlumniDashboard", () => {
  it("TC-004 keeps alumni actions visible and gives the bulletin owned overflow", () => {
    const html = renderToStaticMarkup(
      createElement(AlumniDashboard, {
        dashboard,
        firstName: "Dylan",
      }),
    );

    expect(html).toContain('data-alumni-dashboard-layout="screen-height"');
    expect(html).toContain('data-alumni-primary-actions="always-visible"');
    expect(html).toContain('data-alumni-bulletin-overflow="owned"');
    expect(html).toContain("min-h-0");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("Support Knight Hacks");
    expect(html).toContain("Join the alumni Discord");
    expect(html).toContain("Update career history");
    expect(html).toContain("Current officers");
    expect(html).toContain("Give the next generation a hand");
  });

  it("TC-007 renders only meaningful recap values and no implementation copy", () => {
    const html = renderToStaticMarkup(
      createElement(AlumniDashboard, {
        dashboard: {
          ...dashboard,
          bulletin: [],
          recap: {
            classOf: 2025,
            memberSince: 2022,
          },
        },
        firstName: "Dylan",
      }),
    );

    expect(html).toContain("Member since");
    expect(html).toContain("Class of");
    expect(html).toContain("Nothing needs your attention right now.");
    expect(html).not.toContain("N/A");
    expect(html).not.toContain("community verified");
    expect(html).not.toContain("Guild profile");
  });

  it("preserves the exact legacy donation and alumni Discord destinations", () => {
    const html = renderToStaticMarkup(
      createElement(AlumniDashboard, {
        dashboard,
        firstName: "Dylan",
      }),
    );

    expect(html).toContain("https://buy.stripe.com/6oU28q3Hm8Rm2rd5aOcfK0d");
    expect(html).toContain("https://buy.stripe.com/bJe14m3Hmd7CfdZbzccfK0e");
    expect(html).toContain("https://buy.stripe.com/7sYcN4dhW6Jegi35aOcfK0f");
    expect(html).toContain("https://buy.stripe.com/8x228qa5K1oUe9VdHkcfK0c");
    expect(html).toContain(
      "https://discord.com/channels/486628710443778071/1052981290267312248",
    );
  });
});
