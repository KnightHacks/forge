"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

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
import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { ADMIN_PIE_CHART_COLORS } from "@forge/consts/knight-hacks";

export default function AttendancesBarChart({ events } : { events: ReturnEvent[] }) {
  const baseConfig: ChartConfig = {
    events: { label: "events" },
  };
  let colorIdx = 0;
  events.forEach(({ tag }) => {
    if (!baseConfig[tag]) {
      baseConfig[tag] = {
        label: tag,
        color: ADMIN_PIE_CHART_COLORS[colorIdx % ADMIN_PIE_CHART_COLORS.length],
      };
      colorIdx++;
    }
  });

  const tagData: Record<string, { totalAttendees: number, totalEvents: number }> = {};
  events.forEach(({ tag, numAttended }) => {
    if (numAttended !== 0) {
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
    fill: baseConfig[tag]?.color ?? "#ffffff",
  }));

  const maxAvgAttendees = Math.max(...avgAttendedData.map((d) => Number(d.avgAttendees)));

  return (
    <Card className="md:col-span-2 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl">Average Attendances by Event Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={baseConfig}>
          <BarChart
            accessibilityLayer
            data={avgAttendedData}
            layout="vertical"
            margin={{
              left: 25,
            }}
          >
            <YAxis
              dataKey="tag"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <XAxis dataKey="avgAttendees" type="number" hide domain={[0, maxAvgAttendees]} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="avgAttendees" name="Average attendees: " layout="vertical" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
