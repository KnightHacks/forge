import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function AttendancesMobile({
  events,
  className,
}: {
  events: ReturnEvent[];
  className?: string;
}) {
  const tagData: Record<
    string,
    { totalAttendees: number; totalEvents: number }
  > = {};
  events.forEach(({ tag, numAttended, numHackerAttended }) => {
    if (numAttended + numHackerAttended >= 5) {
      tagData[tag] = {
        // data to calculate avg attendees per event type
        totalAttendees:
          (tagData[tag]?.totalAttendees ?? 0) + numAttended + numHackerAttended,
        totalEvents: (tagData[tag]?.totalEvents ?? 0) + 1,
      };
    }
  });

  const avgAttendedData = Object.entries(tagData).map(
    ([tag, { totalAttendees, totalEvents }]) => ({
      tag: tag,
      avgAttendees: (totalAttendees / totalEvents).toFixed(0),
    }),
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">
          Average Attendances by Event Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        {avgAttendedData.length > 0 ? (
          avgAttendedData.map((data) => (
            <li
              key={data.tag}
              className="flex list-none justify-between border-b-2 border-dotted"
            >
              <span className="font-semibold text-fuchsia-700">
                {data.tag}:
              </span>
              <span>{data.avgAttendees}</span>
            </li>
          ))
        ) : (
          <p className="mb-20 mt-16 text-center text-slate-300">
            No attendance data found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
