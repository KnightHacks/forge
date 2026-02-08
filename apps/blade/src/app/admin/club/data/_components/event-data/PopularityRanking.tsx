import { useState } from "react";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { FORMS } from '@forge/consts';

/**
 * Render a card titled "Most Popular Events" showing events ranked by total attendance.
 *
 * Displays up to 10 events that have at least one attendee, showing the top 3 by default.
 * If more than 3 events are available, a "Show more" / "Show less" toggle reveals or hides the full list.
 *
 * @param events - Array of events to rank; each event is expected to include `id`, `name`, `tag`, `numAttended`, and `numHackerAttended`
 * @returns A React element containing an ordered list of ranked events with attendance counts and an optional toggle button
 */
export default function PopularityRanking({
  events,
}: {
  events: ReturnEvent[];
}) {
  const [displayFullList, setDisplayFullList] = useState<boolean>(false);

  const topEvents = events
    .filter((event) => event.numAttended + event.numHackerAttended > 0)
    .sort(
      (a, b) =>
        b.numAttended +
        b.numHackerAttended -
        (a.numAttended + a.numHackerAttended),
    )
    .slice(0, 10);

  const handleClick = () => setDisplayFullList((prev) => !prev);

  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl">Most Popular Events</CardTitle>
      </CardHeader>
      <CardContent>
        {topEvents.length > 0 ? (
          <ol className="mb-4 flex flex-col gap-2">
            {(displayFullList ? topEvents : topEvents.slice(0, 3)).map(
              (event, index: number) => (
                <li
                  key={event.id}
                  className={`flex justify-between text-sm ${FORMS.RANKING_STYLES[index] ?? "text-gray-400 md:text-base lg:text-base"}`}
                >
                  <span className="me-4">
                    {index + 1}. {event.name} &#91;{event.tag.toUpperCase()}
                    &#93;
                  </span>
                  <span>
                    {event.numAttended + event.numHackerAttended} attended
                  </span>
                </li>
              ),
            )}
          </ol>
        ) : (
          <p className="mb-14 mt-10 text-center text-slate-300">
            No attendance data found
          </p>
        )}
        <div className="flex justify-center">
          {topEvents.length > 3 && ( // no need for show more toggle if there are 3 or less events
            <Button variant="secondary" onClick={handleClick}>
              {displayFullList ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}