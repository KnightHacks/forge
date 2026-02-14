import { useState } from "react";

import { FORMS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface Feedback {
  event: string;
  howHear: string;
  rating: number;
}

export default function RatingRanking({ feedback }: { feedback: Feedback[] }) {
  const [displayFullList, setDisplayFullList] = useState<boolean>(false);

  const aggregate = new Map<string, { total: number; count: number }>();
  feedback.forEach((f) => {
    if (!aggregate.has(f.event)) aggregate.set(f.event, { total: 0, count: 0 });
    const cur = aggregate.get(f.event);
    if (cur)
      aggregate.set(f.event, {
        total: cur.total + f.rating,
        count: cur.count + 1,
      });
  });
  const averages = Array.from(aggregate.entries()).map(([k, v]) => {
    return { name: k, average: v.total / v.count };
  });

  const topEvents = averages.sort((a, b) => b.average - a.average).slice(0, 10);

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
                  key={event.name}
                  className={`flex justify-between text-sm ${FORMS.RANKING_STYLES[index] ?? "text-gray-400 md:text-base lg:text-base"}`}
                >
                  <span className="me-4">
                    {index + 1}. {event.name}
                  </span>
                  <span>Average Rating: {event.average}</span>
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
