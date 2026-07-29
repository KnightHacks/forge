import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmailPortalWorkspace } from "~/app/_components/admin/email/email-portal-workspace";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/email",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("tab=compose"),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    email: {
      cancelSend: { useMutation: vi.fn(() => ({ isPending: false })) },
      confirmSend: { useMutation: vi.fn(() => ({ isPending: false })) },
      previewSend: { useMutation: vi.fn(() => ({ isPending: false })) },
      retrySend: { useMutation: vi.fn(() => ({ isPending: false })) },
    },
  },
}));

describe("Email Portal workspace", () => {
  it("TC-021 makes the exact unique count primary in confirmation", () => {
    const html = renderToStaticMarkup(
      createElement(EmailPortalWorkspace, {
        audienceOptions: [],
        initialTab: "compose",
        preview: {
          blockers: [],
          counts: {
            duplicatesCollapsed: 5,
            excludedBlocklisted: 2,
            excludedInvalid: 1,
            excludedMissingFields: 3,
            excludedUnsubscribed: 4,
            finalUnique: 42,
            rawMatches: 57,
          },
          expiresAt: "2026-07-25T18:15:00.000Z",
          version: "pv_01J00000000000000000000000",
        },
        sends: [],
        templates: [],
      }),
    );

    expect(html).toContain("42");
    expect(html).toContain("Campaign communications");
    expect(html).toContain("Send test to directors");
    expect(html).not.toContain("Safety rail");
    expect(html).not.toContain("Expressive, bounded TSX");
    expect(html).toMatch(/unique recipient/i);
    expect(html).toMatch(/5.*duplicate|duplicate.*5/i);
    expect(html).toMatch(/7.*suppressed|suppressed.*7/i);
    expect(html).toMatch(/3.*missing|missing.*3/i);
    expect(html).toMatch(/send now|schedule/i);
  });

  it("TC-060 renders all lifecycle states with accessible tab controls", () => {
    const statuses = [
      "draft",
      "compiling",
      "scheduled",
      "running",
      "completed",
      "cancelled",
      "retryable_failure",
      "terminal_failure",
    ] as const;
    const html = renderToStaticMarkup(
      createElement(EmailPortalWorkspace, {
        audienceOptions: [],
        initialTab: "sends",
        preview: null,
        sends: statuses.map((status, index) => ({
          id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          recipientCount: index + 1,
          status,
          subject: `${status} send`,
        })),
        templates: [],
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain("Templates");
    expect(html).toContain("Compose");
    expect(html).toContain("Sends");
    expect(html).toContain("View details for draft send");
    for (const status of statuses) {
      expect(html.toLowerCase()).toContain(status.replace("_", " "));
    }
  });

  it("TC-NEG-003 disables confirmation while personalization blockers remain", () => {
    const html = renderToStaticMarkup(
      createElement(EmailPortalWorkspace, {
        audienceOptions: [],
        initialTab: "compose",
        preview: {
          blockers: [
            {
              code: "MISSING_REQUIRED_FIELD",
              count: 2,
              field: "recipient.firstName",
            },
          ],
          counts: {
            duplicatesCollapsed: 0,
            excludedBlocklisted: 0,
            excludedInvalid: 0,
            excludedMissingFields: 2,
            excludedUnsubscribed: 0,
            finalUnique: 10,
            rawMatches: 12,
          },
          expiresAt: "2026-07-25T18:15:00.000Z",
          version: "pv_01J00000000000000000000000",
        },
        sends: [],
        templates: [],
      }),
    );

    expect(html).toContain("recipient.firstName");
    expect(html).toMatch(/disabled[^>]*>[^<]*(confirm|send)/i);
  });

  it("disables audience delivery when Blade is running in test mode", () => {
    const html = renderToStaticMarkup(
      createElement(EmailPortalWorkspace, {
        audienceOptions: [],
        campaignAudienceMode: "disabled",
        initialTab: "compose",
        preview: {
          blockers: [],
          counts: {
            duplicatesCollapsed: 0,
            excludedBlocklisted: 0,
            excludedInvalid: 0,
            excludedMissingFields: 0,
            excludedUnsubscribed: 0,
            finalUnique: 7,
            rawMatches: 7,
          },
          expiresAt: "2026-07-25T18:15:00.000Z",
          version: "pv_01J00000000000000000000000",
        },
        sends: [],
        templates: [],
      }),
    );

    expect(html).toContain("Audience delivery is disabled in this environment");
    expect(html).toMatch(/disabled[^>]*>Review &amp; confirm/i);
    expect(html).toContain("Send test to directors");
  });

  it("shows team and every role in development review mode", () => {
    const html = renderToStaticMarkup(
      createElement(EmailPortalWorkspace, {
        audienceOptions: {
          hackathons: [
            {
              allLabel: "BloomKnights Hackers",
              displayName: "BloomKnights",
              id: "00000000-0000-4000-8000-000000000001",
              name: "bloomknights",
              statuses: ["confirmed"],
            },
          ],
          presets: [
            { kind: "current_members", label: "Current members" },
            { kind: "alumni", label: "Alumni" },
            { kind: "team_members", label: "Team members" },
          ],
          roles: [
            {
              id: "00000000-0000-4000-8000-000000000020",
              name: "Design",
            },
          ],
        },
        campaignAudienceMode: "development_review",
        initialTab: "compose",
        preview: null,
        sends: [],
        templates: [],
      }),
    );

    expect(html).toContain("Development review mode is live");
    expect(html).toContain("Team members");
    expect(html).toContain("Design");
    expect(html).not.toContain("Current members");
    expect(html).not.toContain("BloomKnights Hackers");
    expect(html).toMatch(/checked=""/);
    expect(html).not.toMatch(/disabled="" checked=""/);
  });
});
