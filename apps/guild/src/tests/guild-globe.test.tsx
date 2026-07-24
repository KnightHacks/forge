import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { GlobeCluster } from "../app/_components/guild-globe";
import { GuildGlobe } from "../app/_components/guild-globe";

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options: { loading: () => React.ReactNode }) =>
    options.loading,
}));

const clusters = [
  {
    count: 1,
    key: "12-53000",
    label: "Orlando, FL",
    latitude: 28.5383,
    longitude: -81.3792,
    name: "Orlando",
    profiles: [
      {
        about: null,
        company: "AMD",
        employmentHistory: [],
        firstName: "Casey",
        githubProfileUrl: null,
        gradDate: "2027-05-01",
        id: "00000000-0000-4000-8000-000000000456",
        lastName: "Member",
        linkedinProfileUrl: null,
        major: "Computer Science",
        memberSinceDate: "2024-01-01",
        memberStatus: "current" as const,
        opportunityStatuses: [],
        profilePictureUrl: null,
        resumeAvailable: false,
        roleCallout: null,
        school: "University of Central Florida",
        tagline: "Software engineer",
        websiteUrl: null,
      },
    ],
    state: "FL",
  },
] satisfies GlobeCluster[];

describe("Guild globe fallback", () => {
  it("keeps every city and profile available without WebGL", () => {
    const html = renderToStaticMarkup(createElement(GuildGlobe, { clusters }));

    expect(html).toContain("Orlando, FL");
    expect(html).toContain("Casey Member");
    expect(html).toContain(
      'href="/members/00000000-0000-4000-8000-000000000456?from=/globe"',
    );
    expect(html).toContain("Current location");
    expect(html).toContain("Plotting the Guild");
  });

  it("keeps the globe surface visible before members share a city", () => {
    const html = renderToStaticMarkup(
      createElement(GuildGlobe, { clusters: [] }),
    );

    expect(html).toContain("Plotting the Guild");
    expect(html).not.toContain("<aside");
  });
});
