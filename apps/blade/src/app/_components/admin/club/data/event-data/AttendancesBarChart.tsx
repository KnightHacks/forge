"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
import type { ChartConfig } from "@forge/ui/chart";
import { FORMS } from "@forge/consts";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

export default function AttendancesBarChart({
  events,
  className,
}: {
  events: ReturnEvent[];
  className?: string;
}) {
  const baseConfig: ChartConfig = {
    events: { label: "events" },
  };
  events.forEach(({ tag }) => {
    if (!baseConfig[tag]) {
      baseConfig[tag] = {
        label: tag,
        color: FORMS.ADMIN_PIE_CHART_COLORS[6],
      };
    }
  });

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
      fill: baseConfig[tag]?.color ?? FORMS.ADMIN_PIE_CHART_COLORS[6],
    }),
  );

  const maxAttendees = Math.max(
    ...avgAttendedData.map((d) => Number(d.avgAttendees)),
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
          <ChartContainer config={baseConfig}>
            <BarChart
              accessibilityLayer
              data={avgAttendedData}
              layout="vertical"
              margin={{ right: 25 }}
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
              <XAxis
                dataKey="avgAttendees"
                type="number"
                domain={[0, maxAttendees]}
                hide
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="avgAttendees"
                name="Average attendees: "
                layout="vertical"
                radius={4}
                barSize={100}
              >
                <LabelList
                  dataKey="tag"
                  position="insideLeft"
                  offset={8}
                  fontSize={12}
                  className="fill-[--color-label]"
                />
                <LabelList
                  dataKey="avgAttendees"
                  position="right"
                  offset={8}
                  fontSize={12}
                  className="fill-foreground"
                />
              </Bar>
            </BarChart>
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
