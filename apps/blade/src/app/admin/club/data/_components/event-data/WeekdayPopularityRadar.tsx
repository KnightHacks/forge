"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import type { ChartConfig } from "@forge/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";
import { FORMS } from '@forge/consts';

export function WeekdayPopularityRadar({ events }: { events: ReturnEvent[] }) {
  const chartConfig = {
    attendees: {
      label: "Average attendees",
      color: FORMS.ADMIN_PIE_CHART_COLORS[1],
    },
  } satisfies ChartConfig;

  const weekdayData: Record<
    string,
    { totalAttendees: number; totalEvents: number }
  > = {};
  events.forEach(({ start_datetime, numAttended, numHackerAttended }) => {
    if (numAttended + numHackerAttended >= 5) {
      switch (start_datetime.getDay()) {
        case 1: {
          weekdayData.Mon = {
            totalAttendees:
              (weekdayData.Monday?.totalAttendees ?? 0) +
              numAttended +
              numHackerAttended,
            totalEvents: (weekdayData.Monday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 2: {
          weekdayData.Tues = {
            totalAttendees:
              (weekdayData.Tuesday?.totalAttendees ?? 0) +
              numAttended +
              numHackerAttended,
            totalEvents: (weekdayData.Tuesday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 3: {
          weekdayData.Wed = {
            totalAttendees:
              (weekdayData.Wednesday?.totalAttendees ?? 0) +
              numAttended +
              numHackerAttended,
            totalEvents: (weekdayData.Wednesday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 4: {
          weekdayData.Thurs = {
            totalAttendees:
              (weekdayData.Thursday?.totalAttendees ?? 0) +
              numAttended +
              numHackerAttended,
            totalEvents: (weekdayData.Thursday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 5: {
          weekdayData.Fri = {
            totalAttendees:
              (weekdayData.Friday?.totalAttendees ?? 0) +
              numAttended +
              numHackerAttended,
            totalEvents: (weekdayData.Friday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        default: {
          if (start_datetime.getDay() == 0 || start_datetime.getDay() == 6) {
            weekdayData["Sat/Sun"] = {
              totalAttendees:
                (weekdayData.Weekend?.totalAttendees ?? 0) +
                numAttended +
                numHackerAttended,
              totalEvents: (weekdayData.Weekend?.totalEvents ?? 0) + 1,
            };
          }
          break;
        }
      }
    }
  });

  const weekdayAvgData = Object.entries(weekdayData)
    .map(([weekday, { totalAttendees, totalEvents }]) => ({
      weekday: weekday,
      avgAttendees: (totalAttendees / totalEvents).toFixed(0),
      fill: FORMS.ADMIN_PIE_CHART_COLORS[1],
    }))
    .sort(
      (a, b) =>
        FORMS.WEEKDAY_ORDER.indexOf(a.weekday) - FORMS.WEEKDAY_ORDER.indexOf(b.weekday),
    );

  const maxAvgAttendees = Math.max(
    ...weekdayAvgData.map((d) => Number(d.avgAttendees)),
  );

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-xl">Average Attendance by Weekday</CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        {weekdayAvgData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadarChart
              data={weekdayAvgData}
              margin={{
                left: 60,
              }}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis dataKey="weekday" />
              <PolarRadiusAxis
                tick={false}
                axisLine={false}
                domain={[0, maxAvgAttendees]}
              />
              <PolarGrid />
              <Radar
                dataKey="avgAttendees"
                name="Average Attendees:"
                fill={FORMS.ADMIN_PIE_CHART_COLORS[1]}
                fillOpacity={0.6}
                dot={{
                  r: 4,
                  fillOpacity: 1,
                }}
              />
            </RadarChart>
          </ChartContainer>
        ) : (
          <p className="mb-20 mt-16 text-center text-slate-300">
            No attendance data found
          </p>
        )}
      </CardContent>
    </Card>
  );
}
