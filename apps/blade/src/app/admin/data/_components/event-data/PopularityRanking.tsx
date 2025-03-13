import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { useState } from "react";

export default function PopularityRanking({ events } : { events: ReturnEvent[]; }) {
    const [displayFullList, setDisplayFullList] = useState<boolean>(false);

    const topEvents = events.sort((a, b) => b.numAttended - a.numAttended)
        .slice(0, 10);

    const rankingStyles = [
        "text-lg font-bold text-yellow-500", // gold
        "text-lg font-semibold text-gray-400", // silver
        "text-lg font-medium text-orange-500", // bronze
    ];

    const handleClick = () => setDisplayFullList((prev) => !prev);

    return (
        <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-xl">Most Popular Events</CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="flex flex-col gap-2 mb-4">
                    {
                        (displayFullList ? topEvents : topEvents.slice(0, 3)).map((event, index) =>
                            <li key={event.id} className={(rankingStyles[index] ?? "text-gray-400") + " flex justify-between"}>
                                <span>{index+1}. {event.name} &#91;{event.tag}&#93;</span><span>{event.numAttended} attendees</span>
                            </li>
                        )
                    }
                </ol>
                <div className="flex justify-center">
                    <Button variant="secondary" onClick={handleClick}>
                        {displayFullList ? "Show less" : "Show more"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}