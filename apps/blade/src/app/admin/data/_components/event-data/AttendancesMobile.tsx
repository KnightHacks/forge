import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function AttendancesMobile({ events, className } : { events: ReturnEvent[], className?: string }) {
    const tagData: Record<string, { totalAttendees: number, totalEvents: number }> = {};
    events.forEach(({ tag, numAttended }) => {
      if (numAttended >= 5) {
        tagData[tag] = {
          // data to calculate avg attendees per event type
          totalAttendees: (tagData[tag]?.totalAttendees ?? 0) + numAttended,
          totalEvents: (tagData[tag]?.totalEvents ?? 0) + 1,
        };
      }
    });

    const avgAttendedData = Object.entries(tagData).map(([tag, {totalAttendees, totalEvents}]) => ({
        tag: tag,
        avgAttendees: (totalAttendees / totalEvents).toFixed(0),
    }));

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-xl">Average Attendances by Event Type</CardTitle>
            </CardHeader>
            <CardContent>
                {avgAttendedData.map((data) => <li key={data.tag} className="list-none flex justify-between border-b-2 border-dotted">
                    <span className="text-fuchsia-700 font-semibold">{data.tag}:</span>
                    <span>{data.avgAttendees}</span>
                </li>)}
            </CardContent>
        </Card>
    );
}