import {
  Award,
  CalendarDays,
  Clock,
  Code,
  GraduationCap,
  Star,
  Trophy,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

import type { api as serverCall } from "~/trpc/server";
import { DASHBOARD_ICON_SIZE } from "~/consts";

interface AlumniRecapProps {
  member: NonNullable<
    Awaited<ReturnType<(typeof serverCall.member)["getMember"]>>
  >;
  events: Awaited<ReturnType<(typeof serverCall.member)["getEvents"]>>;
  hackathons: Awaited<
    ReturnType<(typeof serverCall.hackathon)["getPastHackathons"]>
  >;
  boardPosition?: string | null;
}

function getClassYear(gradDate: Date | string): string {
  const date = typeof gradDate === "string" ? new Date(gradDate) : gradDate;
  if (isNaN(date.getTime())) return "N/A";
  return `Class of ${date.getFullYear()}`;
}

function getYearsAsMember(dateCreated: Date | string): number {
  const created =
    typeof dateCreated === "string" ? new Date(dateCreated) : dateCreated;
  if (isNaN(created.getTime())) return 0;
  const now = new Date();
  const years = now.getFullYear() - created.getFullYear();
  // Adjust if the anniversary hasn't happened yet this year
  const hasAnniversaryPassed =
    now.getMonth() > created.getMonth() ||
    (now.getMonth() === created.getMonth() &&
      now.getDate() >= created.getDate());
  return hasAnniversaryPassed ? years : years - 1;
}

function getMostActiveYear(
  events: AlumniRecapProps["events"],
  hackathons: AlumniRecapProps["hackathons"],
): string | null {
  const yearCounts: Record<number, number> = {};

  for (const event of events) {
    const year = new Date(event.start_datetime).getFullYear();
    yearCounts[year] = (yearCounts[year] ?? 0) + 1;
  }

  for (const hack of hackathons) {
    const year = new Date(hack.startDate).getFullYear();
    yearCounts[year] = (yearCounts[year] ?? 0) + 1;
  }

  const entries = Object.entries(yearCounts);
  if (entries.length === 0) return null;

  const [bestYear, bestCount] = entries.reduce((max, curr) =>
    Number(curr[1]) > Number(max[1]) ? curr : max,
  );

  return `${bestYear} (${bestCount} event${Number(bestCount) !== 1 ? "s" : ""})`;
}

export function AlumniRecap({
  member,
  events,
  hackathons,
  boardPosition,
}: AlumniRecapProps) {
  const eventsAttended = events.length;
  const hacksAttended = hackathons.length;
  const hackathonNames = hackathons.map((h) => h.name).filter(Boolean);
  const classYear = getClassYear(member.gradDate);
  const yearsAsMember = getYearsAsMember(member.dateCreated);
  const mostActiveYear = getMostActiveYear(events, hackathons);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">KH Recap</CardTitle>
        <Trophy color="hsl(263.4 70% 50.4%)" size={DASHBOARD_ICON_SIZE} />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Class Year */}
        <div className="flex items-center gap-2">
          <GraduationCap
            className="shrink-0"
            color="hsl(263.4 70% 50.4%)"
            size={16}
          />
          <div>
            <p className="text-sm font-semibold">{classYear}</p>
          </div>
        </div>

        {/* Years as Member */}
        <div className="flex items-center gap-2">
          <Clock className="shrink-0" color="hsl(263.4 70% 50.4%)" size={16} />
          <div>
            <p className="text-sm font-semibold">
              {yearsAsMember} {yearsAsMember === 1 ? "Year" : "Years"} as a
              Member
            </p>
          </div>
        </div>

        {/* Board Position */}
        {boardPosition && (
          <div className="flex items-center gap-2">
            <Award
              className="shrink-0"
              color="hsl(263.4 70% 50.4%)"
              size={16}
            />
            <div>
              <p className="text-sm font-semibold">{boardPosition}</p>
              <p className="text-xs text-muted-foreground">Board History</p>
            </div>
          </div>
        )}

        {/* Events Attended */}
        <div className="flex items-center gap-2">
          <CalendarDays
            className="shrink-0"
            color="hsl(263.4 70% 50.4%)"
            size={16}
          />
          <div>
            <p className="text-sm font-semibold">
              {eventsAttended} Events Attended
            </p>
          </div>
        </div>

        {/* Hackathons Attended */}
        <div className="flex items-center gap-2">
          <Code className="shrink-0" color="hsl(263.4 70% 50.4%)" size={16} />
          <div>
            <p className="text-sm font-semibold">
              {hacksAttended} {hacksAttended === 1 ? "Hackathon" : "Hackathons"}{" "}
              Attended
            </p>
            {hackathonNames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {hackathonNames.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Most Active Year */}
        {mostActiveYear && (
          <div className="flex items-center gap-2">
            <Star className="shrink-0" color="hsl(263.4 70% 50.4%)" size={16} />
            <div>
              <p className="text-sm font-semibold">
                Most Active: {mostActiveYear}
              </p>
            </div>
          </div>
        )}

        {/* Lifetime Points */}
        <div className="flex items-center gap-2">
          <Trophy className="shrink-0" color="hsl(263.4 70% 50.4%)" size={16} />
          <div>
            <p className="text-sm font-semibold">
              {member.points} Lifetime Points
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
