import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import type {
  Semester} from "@forge/consts/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function AttendancesMobile({
  events,
  className,
  semester
}: {
  events: ReturnEvent[];
  className?: string;
  semester: Semester | null;
}) {
  if (semester) console.log(`AttendancesMobile semester: ${JSON.stringify(semester)}`);
  
  const tagData: Record<
    string,
    { totalAttendees: number; totalEvents: number }
  > = {};
  events.forEach(({ tag, numAttended }) => {
    if (numAttended >= 5) {
      tagData[tag] = {
        // data to calculate avg attendees per event type
        totalAttendees: (tagData[tag]?.totalAttendees ?? 0) + numAttended,
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
        {avgAttendedData.map((data) => (
          <li
            key={data.tag}
            className="flex list-none justify-between border-b-2 border-dotted"
          >
            <span className="font-semibold text-fuchsia-700">{data.tag}:</span>
            <span>{data.avgAttendees}</span>
          </li>
        ))}
      </CardContent>
    </Card>
  );
}
