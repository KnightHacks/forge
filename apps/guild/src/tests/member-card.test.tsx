import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { GuildProfile } from "@forge/validators";

import { MemberCard } from "../app/_components/member-card";

const profile: GuildProfile = {
  about: "Builds community tools.",
  company: "Knight Hacks",
  employmentHistory: [],
  firstName: "Casey",
  githubProfileUrl: null,
  gradDate: "2027-05-02",
  id: "00000000-0000-4000-8000-000000000123",
  lastName: "Member",
  linkedinProfileUrl: null,
  major: "Computer Science",
  memberSinceDate: "2022-09-14",
  memberStatus: "current",
  opportunityStatuses: [
    "internships",
    "project-collaboration",
    "offering-mentorship",
  ],
  profilePictureUrl: null,
  resumeAvailable: true,
  roleCallout: {
    category: "director",
    color: "#eaacff",
    label: "Design Director",
  },
  school: "University of Central Florida",
  tagline: "Designer and community builder",
  websiteUrl: null,
};

describe("Guild member card", () => {
  it("links to the stable profile and keeps the card compact", () => {
    const html = renderToStaticMarkup(createElement(MemberCard, { profile }));

    expect(html).toContain(
      'href="/members/00000000-0000-4000-8000-000000000123"',
    );
    expect(html).toContain("Casey Member");
    expect(html).toContain("Design Director");
    expect(html).toContain("guild-team-callout");
    expect(html).toContain("guild-card-grad-meta");
    expect(html).toContain('aria-label="Class of 2027"');
    expect(html).toContain('aria-label="Member since 2022"');
    expect(html).toContain("Since 2022");
    expect(html).toContain(">2027<");
    expect(html).toContain("Computer Science");
    expect(html).toContain("Public resume available");
    expect(html).toContain("Open to internships");
    expect(html).toContain("Open to project collaboration");
    expect(html).not.toContain("Offering mentorship");
    expect(html).not.toContain("dialog");
  });

  it("uses initials when profile-picture signing is unavailable", () => {
    const html = renderToStaticMarkup(createElement(MemberCard, { profile }));

    expect(html).toContain(">CM<");
    expect(html).not.toContain("<img");
  });

  it("keeps alumni, role, and missing-tagline states in the shared card slots", () => {
    const html = renderToStaticMarkup(
      createElement(MemberCard, {
        profile: {
          ...profile,
          company: null,
          memberStatus: "alumni",
          roleCallout: null,
          tagline: null,
        },
      }),
    );

    expect(html).toContain('data-has-role="false"');
    expect(html).toContain('data-has-tagline="false"');
    expect(html).toContain('data-member-status="alumni"');
    expect(html).toContain("Knight Hacks community member");
    expect(html).toContain('aria-label="Alumni, class of 2027"');
    expect(html).toContain("guild-card-tags");
    expect(html).toContain("guild-alumni-pill");
    expect(html).toContain('aria-label="Alumni member"');
    expect(html).not.toContain("guild-team-callout");
  });

  it("keeps alumni distinction under the tagline and outside the role band", () => {
    const html = renderToStaticMarkup(
      createElement(MemberCard, {
        profile: {
          ...profile,
          memberStatus: "alumni",
        },
      }),
    );

    expect(html).toContain("guild-team-callout");
    expect(html).toContain("guild-alumni-pill");
    expect(html).toContain("guild-card-grad-meta-alumni");
    expect(html).toContain('aria-label="Alumni, class of 2027"');
  });

  it("renders external profile links beside, not inside, the card profile link", () => {
    const html = renderToStaticMarkup(
      createElement(MemberCard, {
        profile: {
          ...profile,
          githubProfileUrl: "https://github.com/knighthacks",
          linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks/",
          websiteUrl: "https://knighthacks.org",
        },
      }),
    );

    expect(html).toContain(
      'aria-label="View Casey Member&#x27;s Guild profile"',
    );
    expect(html).toContain('aria-label="Open Casey Member&#x27;s LinkedIn"');
    expect(html).toContain('aria-label="Open Casey Member&#x27;s GitHub"');
    expect(html).toContain('aria-label="Open Casey Member&#x27;s Portfolio"');
    expect(html.match(/<a /g)).toHaveLength(4);

    const profileLinkEnd = html.indexOf(
      "</a>",
      html.indexOf('aria-label="View Casey Member&#x27;s Guild profile"'),
    );
    const firstExternalLink = html.indexOf(
      'aria-label="Open Casey Member&#x27;s LinkedIn"',
    );
    expect(profileLinkEnd).toBeLessThan(firstExternalLink);
  });
});
