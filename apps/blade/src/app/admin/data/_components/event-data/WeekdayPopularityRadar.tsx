"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import type {
  ChartConfig} from "@forge/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";
import { ADMIN_PIE_CHART_COLORS, WEEKDAY_ORDER } from "@forge/consts/knight-hacks";
import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";

export function WeekdayPopularityRadar({ events } : { events: ReturnEvent[] }) {
  const chartConfig = {
    attendees: {
        label: "Average attendees",
        color: ADMIN_PIE_CHART_COLORS[1],
    }
  } satisfies ChartConfig;

  const weekdayData: Record<string, { totalAttendees: number, totalEvents: number }> = {};
  events.forEach(({ start_datetime, numAttended}) => {
    if (numAttended >= 5) {
      switch (start_datetime.getDay()) {
        case 1: {
          weekdayData.Mon = { 
            totalAttendees: (weekdayData.Monday?.totalAttendees ?? 0) + numAttended, 
            totalEvents: (weekdayData.Monday?.totalEvents ?? 0) + 1,
          }
          break;
        };
        case 2: {
          weekdayData.Tues = { 
            totalAttendees: (weekdayData.Tuesday?.totalAttendees ?? 0) + numAttended,
            totalEvents: (weekdayData.Tuesday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 3: {
          weekdayData.Wed = {
            totalAttendees: (weekdayData.Wednesday?.totalAttendees ?? 0) + numAttended,
            totalEvents: (weekdayData.Wednesday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 4: {
          weekdayData.Thurs = {
            totalAttendees: (weekdayData.Thursday?.totalAttendees ?? 0) + numAttended,
            totalEvents: (weekdayData.Thursday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        case 5: {
          weekdayData.Fri = {
            totalAttendees: (weekdayData.Friday?.totalAttendees ?? 0) + numAttended,
            totalEvents: (weekdayData.Friday?.totalEvents ?? 0) + 1,
          };
          break;
        }
        default: {
          if (start_datetime.getDay() == 0 || start_datetime.getDay() == 6) {
            weekdayData["Sat/Sun"] = {
              totalAttendees: (weekdayData.Weekend?.totalAttendees ?? 0) + numAttended,
              totalEvents: (weekdayData.Weekend?.totalEvents ?? 0) + 1,
            };
          }
          break;
        }
      }
    }
  });

  const weekdayAvgData = Object.entries(weekdayData)
  .map(([weekday, {totalAttendees, totalEvents}]) => ({
    weekday: weekday,
    avgAttendees: (totalAttendees / totalEvents).toFixed(0),
    fill: ADMIN_PIE_CHART_COLORS[1],
  }))
  .sort((a, b) => (WEEKDAY_ORDER as string[]).indexOf(a.weekday) - (WEEKDAY_ORDER as string[]).indexOf(b.weekday));

  const maxAvgAttendees = Math.max(...weekdayAvgData.map(d => Number(d.avgAttendees)));

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle className="text-xl">Average Attendance by Weekday</CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={weekdayAvgData} margin={{
            left: 38,
          }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="weekday" />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, maxAvgAttendees]} />
            <PolarGrid />
            <Radar
              dataKey="avgAttendees"
              name="Average Attendees:"
              fill={ADMIN_PIE_CHART_COLORS[1]}
              fillOpacity={0.6}
              dot={{
                r: 4,
                fillOpacity: 1,
              }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
