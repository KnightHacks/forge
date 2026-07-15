import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EventFeedbackPanel } from "~/app/_components/admin/events/event-feedback-panel";

const responses = [
  {
    answers: {
      discovery: "Discord",
      fun: 4,
      improve: "More practice time.",
      learning: 5,
      overall: 5,
      worked: "The live examples were excellent.",
    },
    member: { id: "member-ada", name: "Ada Builder" },
    responseId: "00000000-0000-4000-8000-000000003101",
    submittedAt: "2026-08-22T18:00:00.000Z",
  },
  {
    answers: {
      discovery: "Instagram",
      fun: 3,
      improve: "",
      learning: 4,
      overall: 3,
      worked: "Clear slides.",
    },
    member: { id: "member-grace", name: "Grace Hopper" },
    responseId: "00000000-0000-4000-8000-000000003102",
    submittedAt: "2026-08-22T18:05:00.000Z",
  },
  {
    answers: {
      discovery: "Other",
      discoveryOther: "A class presentation",
      fun: 2,
      improve: "Slow down the first demo.",
      learning: 1,
      overall: 1,
      worked: "",
    },
    member: { id: "member-linus", name: "Linus Torvalds" },
    responseId: "00000000-0000-4000-8000-000000003103",
    submittedAt: "2026-08-22T18:10:00.000Z",
  },
];

const allMetrics = {
  averages: { fun: 3, learning: 3.33, overall: 3 },
  discovery: [
    { count: 1, label: "Discord" },
    { count: 1, label: "Instagram" },
    { count: 1, label: "Other" },
  ],
  distributions: {
    fun: [0, 1, 1, 1, 0],
    learning: [1, 0, 0, 1, 1],
    overall: [1, 0, 1, 0, 1],
  },
  includedCount: 3,
  locallyExcludedCount: 0,
};

const excludedMetrics = {
  averages: { fun: 3.5, learning: 4.5, overall: 4 },
  discovery: [
    { count: 1, label: "Discord" },
    { count: 1, label: "Instagram" },
  ],
  distributions: {
    fun: [0, 0, 1, 1, 0],
    learning: [0, 0, 0, 1, 1],
    overall: [0, 0, 1, 0, 1],
  },
  includedCount: 2,
  locallyExcludedCount: 1,
};

const aggregateAccess = {
  canEditQuestions: false,
  canReadResponses: false,
  isOfficer: false,
};

const responseAccess = {
  canEditQuestions: false,
  canReadResponses: true,
  isOfficer: false,
};

describe("EventFeedbackPanel", () => {
  it("TC-049 TC-050 gives an event reader useful aggregate metrics without identity or raw text", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackPanel, {
        access: aggregateAccess,
        eventId: "00000000-0000-4000-8000-000000003001",
        eventName: "Git Workshop",
        excludedResponseIds: [],
        metrics: allMetrics,
        onExcludedResponseIdsChange: vi.fn(),
      }),
    );

    expect(html).toContain("Overall rating");
    expect(html).toContain("Fun rating");
    expect(html).toContain("Learning rating");
    expect(html).toContain("3.00");
    expect(html).toContain("3 included");
    expect(html).toContain("0 locally excluded");
    expect(html).toContain("Discovery source");
    expect(html).toContain("Discord");
    expect(html).not.toContain("Ada Builder");
    expect(html).not.toContain("The live examples were excellent.");
    expect(html).not.toContain("Export CSV");
    expect(html).not.toContain("Exclude from metrics");
  });

  it("TC-050 gives a response reader identity, raw answers, CSV, and exclusion controls", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackPanel, {
        access: responseAccess,
        eventId: "00000000-0000-4000-8000-000000003001",
        eventName: "Git Workshop",
        excludedResponseIds: [],
        metrics: allMetrics,
        onExcludedResponseIdsChange: vi.fn(),
        onExportCsv: vi.fn(),
        responses,
      }),
    );

    expect(html).toContain("Ada Builder");
    expect(html).toContain("Grace Hopper");
    expect(html).toContain("Linus Torvalds");
    expect(html).toContain("The live examples were excellent.");
    expect(html).toContain("More practice time.");
    expect(html).toContain("Export CSV");
    expect(html).toContain("Exclude from metrics");
    expect(html).toContain('aria-label="Event feedback responses"');
  });

  it("TC-051 renders exclusions as current-session metric state without hiding retained responses or CSV", () => {
    const initialHtml = renderToStaticMarkup(
      createElement(EventFeedbackPanel, {
        access: responseAccess,
        eventId: "00000000-0000-4000-8000-000000003001",
        eventName: "Git Workshop",
        excludedResponseIds: [],
        metrics: allMetrics,
        onExcludedResponseIdsChange: vi.fn(),
        onExportCsv: vi.fn(),
        responses,
      }),
    );
    const excludedHtml = renderToStaticMarkup(
      createElement(EventFeedbackPanel, {
        access: responseAccess,
        eventId: "00000000-0000-4000-8000-000000003001",
        eventName: "Git Workshop",
        excludedResponseIds: ["00000000-0000-4000-8000-000000003103"],
        metrics: excludedMetrics,
        onExcludedResponseIdsChange: vi.fn(),
        onExportCsv: vi.fn(),
        responses,
      }),
    );

    expect(initialHtml).toContain("3 included");
    expect(initialHtml).toContain("0 locally excluded");
    expect(initialHtml).toContain("3.00");
    expect(excludedHtml).toContain("2 included");
    expect(excludedHtml).toContain("1 locally excluded");
    expect(excludedHtml).toContain("4.00");
    expect(excludedHtml).toContain("Linus Torvalds");
    expect(excludedHtml).toContain("Export CSV");
    expect(excludedHtml).toContain(
      "Exclusions reset when you leave or refresh this view",
    );
    expect(excludedHtml).toContain('data-exclusion-scope="session"');
    expect(excludedHtml).toMatch(
      /00000000-0000-4000-8000-000000003103[\s\S]*checked(?:="")?/,
    );
  });

  it("keeps charts text-labelled and the feedback surface responsive", () => {
    const html = renderToStaticMarkup(
      createElement(EventFeedbackPanel, {
        access: aggregateAccess,
        eventId: "00000000-0000-4000-8000-000000003001",
        eventName: "Git Workshop",
        excludedResponseIds: [],
        metrics: allMetrics,
        onExcludedResponseIdsChange: vi.fn(),
      }),
    );

    expect(html).toContain('data-feedback-metrics-layout="responsive"');
    expect(html).toContain('aria-label="Overall rating distribution"');
    expect(html).toContain('aria-label="Fun rating distribution"');
    expect(html).toContain('aria-label="Learning rating distribution"');
    expect(html).toContain('aria-label="Discovery source distribution"');
  });
});
