import { useState } from "react";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { RANKING_STYLES } from "@forge/consts/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function PopularityRanking({
  events,
}: {
  events: ReturnEvent[];
}) {
  const [displayFullList, setDisplayFullList] = useState<boolean>(false);

  const topEvents = events
    .sort((a, b) => b.numAttended - a.numAttended)
    .slice(0, 10);

  const handleClick = () => setDisplayFullList((prev) => !prev);

  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl">Most Popular Events</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="mb-4 flex flex-col gap-2">
          {(displayFullList ? topEvents : topEvents.slice(0, 3)).map(
            (event, index: number) => (
              <li
                key={event.id}
                className={`flex justify-between text-sm ${RANKING_STYLES[index] ?? "text-gray-400 md:text-base lg:text-base"}`}
              >
                <span className="me-4">
                  {index + 1}. {event.name} &#91;{event.tag.toUpperCase()}&#93;
                </span>
                <span>{event.numAttended} attended</span>
              </li>
            ),
          )}
        </ol>
        <div className="flex justify-center">
        {
          topEvents.length > 3 && // no need for show more toggle if there are 3 or less events
          <Button variant="secondary" onClick={handleClick}>
            {displayFullList ? "Show less" : "Show more"}
          </Button>
        }
        </div>
      </CardContent>
    </Card>
  );
}
