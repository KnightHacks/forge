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
  timeApplied: Date | string;
  timeConfirmed?: Date | string | null;
}

interface ApplicationsOverTimeBarChartProps {
  hackers: Hacker[];
  selectedStatuses: string[];
}

export default function ApplicationsOverTimeBarChart({
  hackers,
  selectedStatuses,
}: ApplicationsOverTimeBarChartProps) {
  // Determine which time field to use based on selected statuses
  const useConfirmedTime =
    selectedStatuses.includes("confirmed") &&
    selectedStatuses.length === 1 &&
    !selectedStatuses.includes("all");

  const chartTitle = useConfirmedTime
    ? "Confirmations Over Time"
    : "Applications Over Time";
  const timeFieldLabel = useConfirmedTime ? "confirmations" : "applications";

  // Create 1-week buckets for applications/confirmations
  const createTimeBuckets = (hackers: Hacker[]) => {
    if (hackers.length === 0) return [];

    // Find the date range using the appropriate time field
    const dates = hackers
      .map((h) => (useConfirmedTime ? h.timeConfirmed : h.timeApplied))
      .filter(Boolean)
      .map((d) => (typeof d === "string" ? new Date(d) : d))
      .filter((d) => d && !isNaN(d.getTime()));

    if (dates.length === 0) return [];

    const validDates = dates.filter(
      (d): d is Date => d instanceof Date && !isNaN(d.getTime()),
    );
    if (validDates.length === 0) return [];

    const minDate = new Date(Math.min(...validDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())));

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

    // Count applications/confirmations in each bucket
    hackers.forEach((hacker) => {
      const timeField = useConfirmedTime
        ? hacker.timeConfirmed
        : hacker.timeApplied;
      if (!timeField) return;

      const applicationDate =
        typeof timeField === "string" ? new Date(timeField) : timeField;

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

    return Object.entries(buckets).map(([period, count]) => ({
      period,
      [timeFieldLabel]: count,
    }));
  };

  const timeData = createTimeBuckets(hackers);
  const totalCount = timeData.reduce(
    (sum, item) => sum + (Number(item[timeFieldLabel]) || 0),
    0,
  );

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>{chartTitle}</CardTitle>
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
                dataKey={timeFieldLabel}
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
          Total {timeFieldLabel}: {totalCount}
        </div>
      </CardFooter>
    </Card>
  );
}
