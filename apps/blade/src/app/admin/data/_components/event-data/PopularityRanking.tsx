import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function PopularityRanking({ events } : { events: ReturnEvent[]; }) {
    const topEvents = events.reduce<ReturnEvent[]>((heap, event) => {
        heap.push(event);
        heap.sort((a, b) => a.numAttended - b.numAttended); // Sort ascending to keep the smallest at index 0

        // Keep only top 10 elements (remove the smallest one if heap exceeds size 10)
        if (heap.length > 10) heap.shift();
        
        return heap;
    }, []);
    topEvents.sort((a, b) => b.numAttended - a.numAttended);

    return (
        <Card className="md:col-span-2 lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-xl">Most Popular Events</CardTitle>
            </CardHeader>
            <CardContent>
                <ol>
                    {topEvents.map((event, index) => (
                        <li key={event.id}>
                            <span className="font-bold">{index+1}.</span><span> {event.name} - {event.numAttended} attendees</span>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
}