import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function PopularityRanking({ events } : { events: ReturnEvent[]; }) {
    const topEvents = events.reduce<ReturnEvent[]>((heap, event) => {
        heap.push(event);
        heap.sort((a, b) => a.numAttended - b.numAttended);

        if (heap.length > 10) heap.shift();
    
        return heap;
    }, []);
    topEvents.sort((a, b) => b.numAttended - a.numAttended);

    const rankingStyles = [
        "text-lg font-bold text-yellow-500", // gold
        "text-lg font-semibold text-gray-400", // silver
        "text-lg font-medium text-orange-500", // bronze
    ];

    return (
        <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-xl">Most Popular Events</CardTitle>
            </CardHeader>
            <CardContent>
                <ol className="flex flex-col gap-2">
                    {topEvents.map((event, index) => (
                        <li key={event.id} className={(rankingStyles[index] ?? "text-gray-400") + " flex justify-between"}>
                            <span>{index+1}. {event.name}</span><span>{event.numAttended} attendees</span>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
}