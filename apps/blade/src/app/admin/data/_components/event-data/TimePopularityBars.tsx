"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import type { ChartConfig } from "@forge/ui/chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

const chartConfig = {
  events: {
    label: "Events",
    color: "#4361ee",
  },
} satisfies ChartConfig;

export default function TimePopularityBars({ events }: { events: ReturnEvent[] }) {
  const timeslotTotalAttendees: Record<string, number> = {};
  events.forEach(({ start_datetime, numAttended }) => {
    const hour = start_datetime.getHours();
    const hourIntervalString = hour + " - " + (hour+1);
    console.log(hour);
    console.log(numAttended);
    timeslotTotalAttendees[hourIntervalString] = (timeslotTotalAttendees[hourIntervalString] ?? 0) + numAttended;
  });
  const timeslotData = Object.entries(timeslotTotalAttendees).map(([hourInterval, attendees]) => ({
    hourInterval: hourInterval,
    attendees: attendees,
  }));

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Total Attendees by Timeslot</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer className="h-full w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={timeslotData}
            margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hourInterval"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="attendees" fill="var(--color-events)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="invisible fill-foreground md:visible lg:visible"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
