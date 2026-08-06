/** @vitest-environment jsdom */

import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  EventCalendar,
  eventCalendarDayKey,
  eventCalendarDayRange,
} from "~/app/_components/admin/events/event-calendar";

vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({ default: {} }));
vi.mock("@fullcalendar/luxon3", () => ({ default: {} }));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/react", () => ({
  default: ({ timeZone }: { timeZone?: string }) =>
    createElement("div", { "data-calendar-time-zone": timeZone }),
}));

describe("EventCalendar", () => {
  it("renders and groups calendar events in club time", () => {
    const html = renderToStaticMarkup(
      createElement(EventCalendar, {
        events: [],
        initialDate: "2026-08-05T12:00:00.000Z",
        onOpenEvent: vi.fn(),
      }),
    );

    expect(html).toContain('data-calendar-time-zone="America/New_York"');
    expect(eventCalendarDayKey("2026-08-06T03:30:00.000Z")).toBe("2026-08-05");
    expect(eventCalendarDayKey("2026-08-06T05:00:00.000Z")).toBe("2026-08-06");
    expect(eventCalendarDayRange("2026-11-01")).toEqual({
      end: "2026-11-02T05:00:00.000Z",
      start: "2026-11-01T04:00:00.000Z",
    });
  });

  it("emits URL-ready club-time bounds from mobile day navigation", () => {
    const onRangeChange = vi.fn();
    render(
      <EventCalendar
        events={[]}
        initialDate="2026-08-05T12:00:00.000Z"
        onOpenEvent={vi.fn()}
        onRangeChange={onRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));

    expect(onRangeChange).toHaveBeenCalledWith({
      end: "2026-08-07T04:00:00.000Z",
      start: "2026-08-06T04:00:00.000Z",
      view: "day",
    });
  });
});
