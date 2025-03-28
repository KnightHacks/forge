"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

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

export default function AttendancesBarChart({ events, className } : { events: ReturnEvent[], className?: string }) {
  const baseConfig: ChartConfig = {
    events: { label: "events" },
  };
  events.forEach(({ tag }) => {
    if (!baseConfig[tag]) {
      baseConfig[tag] = {
        label: tag,
        color: ADMIN_PIE_CHART_COLORS[6],
      };
    }
  });

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
    fill: baseConfig[tag]?.color ?? "#ffffff",
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">Average Attendances by Event Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={baseConfig}>
          <BarChart
            accessibilityLayer
            data={avgAttendedData}
            layout="vertical"
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="tag"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="avgAttendees" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar dataKey="avgAttendees" name="Average attendees: " layout="vertical" radius={4} barSize={100}>
              <LabelList dataKey="tag" position="insideLeft" offset={8} fontSize={12} className="fill-[--color-label]" />
              <LabelList dataKey="avgAttendees" position="right" offset={8} fontSize={12} className="fill-foreground" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
