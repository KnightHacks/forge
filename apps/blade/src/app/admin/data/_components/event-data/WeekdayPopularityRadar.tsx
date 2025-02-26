"use client";

import { TrendingUp } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";
import { ADMIN_PIE_CHART_COLORS } from "@forge/consts/knight-hacks";
import { ReturnEvent } from "@forge/db/schemas/knight-hacks";
const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 273 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
];

// const chartConfig = {
//   desktop: {
//     label: "Desktop",
//     color: "hsl(var(--chart-1))",
//   },
// } satisfies ChartConfig;

export function WeekdayPopularityRadar({ events } : { events: ReturnEvent[] }) {
  // todo does below work 
  const colorUsing = ADMIN_PIE_CHART_COLORS.length > 0 ? 
    ADMIN_PIE_CHART_COLORS[ADMIN_PIE_CHART_COLORS.length - 1]
    : "hsl(var(--chart-1))";
  const chartConfig = {
    attendees: {
        label: "Average attendees",
        color: colorUsing,
    }
  } satisfies ChartConfig;

  const weekDayData: Record<string, { totalAttendees: number, totalEvents: number }> = {};
  events.forEach(({ start_datetime, numAttended }) => {
    console.log(typeof start_datetime);
    const randomVar = numAttended;
  });
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
          <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="desktop"
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
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          January - June 2024
        </div>
      </CardFooter>
    </Card>
  )
}
