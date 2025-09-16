"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

const chartConfig = {
  applications: {
    label: "Applications",
    color: "#4361ee",
  },
} satisfies ChartConfig;

interface Hacker {
  dateCreated: Date | string;
}

interface ApplicationsOverTimeBarChartProps {
  hackers: Hacker[];
}

export default function ApplicationsOverTimeBarChart({
  hackers,
}: ApplicationsOverTimeBarChartProps) {
  // Create 2-week buckets for applications
  const createTimeBuckets = (hackers: Hacker[]) => {
    if (hackers.length === 0) return [];

    // Find the date range
    const dates = hackers
      .map((h) => h.dateCreated)
      .filter(Boolean)
      .map((d) => (typeof d === "string" ? new Date(d) : d))
      .filter((d) => !isNaN(d.getTime()));

    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Create 1-week buckets
    const buckets: Record<string, number> = {};
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Start from the beginning of the week containing minDate
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week

    let currentDate = new Date(startDate);

    // Create buckets until we exceed maxDate
    while (currentDate <= maxDate) {
      const bucketEnd = new Date(currentDate.getTime() + oneWeekMs);
      const bucketKey = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      buckets[bucketKey] = 0;
      currentDate = new Date(bucketEnd);
    }

    // Count applications in each bucket
    hackers.forEach((hacker) => {
      if (!hacker.dateCreated) return;

      const applicationDate =
        typeof hacker.dateCreated === "string"
          ? new Date(hacker.dateCreated)
          : hacker.dateCreated;

      // Skip invalid dates
      if (isNaN(applicationDate.getTime())) return;

      let bucketDate = new Date(startDate);

      while (bucketDate <= maxDate) {
        const bucketEnd = new Date(bucketDate.getTime() + oneWeekMs);

        if (applicationDate >= bucketDate && applicationDate < bucketEnd) {
          const bucketKey = `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`;
          buckets[bucketKey] = (buckets[bucketKey] ?? 0) + 1;
          break;
        }

        bucketDate = new Date(bucketEnd);
      }
    });

    return Object.entries(buckets).map(([period, applications]) => ({
      period,
      applications,
    }));
  };

  const timeData = createTimeBuckets(hackers);
  const totalApplications = timeData.reduce(
    (sum, { applications }) => sum + applications,
    0,
  );

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Applications Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {timeData.length > 0 ? (
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={timeData}
              margin={{
                top: 20,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar
                dataKey="applications"
                fill="var(--color-applications)"
                radius={4}
              >
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No application data available
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Each bar represents a 1-week period
        </div>
        <div className="text-xs text-muted-foreground">
          Total applications: {totalApplications}
        </div>
      </CardFooter>
    </Card>
  );
}
