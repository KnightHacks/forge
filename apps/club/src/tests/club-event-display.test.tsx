import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PublicClubEvent } from "../app/_lib/club-events";
import { ClubEventDate } from "../app/_components/club-event-date";
import { ClubEventDetailsDialog } from "../app/_components/club-event-details-dialog";

const event: PublicClubEvent = {
  id: "00000000-0000-4000-8000-000000000518",
  name: "Fall Kickoff",
  description:
    "Join us for the first GBM of the semester. [Read the agenda](https://example.com/agenda).",
  startDateTime: "2026-09-04T20:00:00.000Z",
  endDateTime: "2026-09-04T22:00:00.000Z",
  location: "Key West Ballroom (SU 218)",
  requiresDues: false,
  tag: "GBM",
  tagColor: "#2563EB",
};

describe("Club event display", () => {
  it("TC-001 renders the month, day, and weekday as one semantic date block", () => {
    const html = renderToStaticMarkup(
      createElement(ClubEventDate, {
        startDateTime: event.startDateTime,
      }),
    );

    expect(html).toContain('<time dateTime="2026-09-04T20:00:00.000Z"');
    expect(html).toMatch(/>Sep<\/span>.*>04<\/span>.*>Fri<\/span>/);
  });

  it("TC-002 exposes an accessible action for the complete event details", () => {
    const html = renderToStaticMarkup(
      createElement(ClubEventDetailsDialog, { event }),
    );

    expect(html).toContain(">View details<");
    expect(html).toContain("button");
  });
});
