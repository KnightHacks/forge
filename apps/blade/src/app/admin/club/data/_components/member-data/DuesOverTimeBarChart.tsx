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
  dues: {
    label: "Dues",
    color: "#4361ee",
  },
} satisfies ChartConfig;

interface DuesPaymentDate {
  paymentDate: Date | string;
}

interface DuesOverTimeBarChartProps {
  duesPaymentDates: DuesPaymentDate[];
}

export default function DuesOverTimeBarChart({
  duesPaymentDates,
}: DuesOverTimeBarChartProps) {
  const createTimeBuckets = (paymentDates: DuesPaymentDate[]) => {
    if (paymentDates.length === 0) return [];

    // Find the date range
    const dates = paymentDates
      .map((p) =>
        typeof p.paymentDate === "string"
          ? new Date(p.paymentDate)
          : p.paymentDate,
      )
      .filter((d) => !isNaN(d.getTime()));

    if (dates.length === 0) return [];

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Create the 1 week bucket
    const buckets: Record<string, number> = {};
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Start from the beginning of the week containing minDate
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentDate = new Date(startDate);

    // Create buckets until we exceed maxDate
    while (currentDate <= maxDate) {
      const bucketEnd = new Date(currentDate.getTime() + oneWeekMs);
      const bucketKey = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
      buckets[bucketKey] = 0;
      currentDate = new Date(bucketEnd);
    }

    // Count the payments in each bucket
    dates.forEach((paymentDate) => {
      let bucketDate = new Date(startDate);

      while (bucketDate <= maxDate) {
        const bucketEnd = new Date(bucketDate.getTime() + oneWeekMs);

        if (paymentDate >= bucketDate && paymentDate < bucketEnd) {
          const bucketKey = `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`;
          buckets[bucketKey] = (buckets[bucketKey] ?? 0) + 1;
          break;
        }

        bucketDate = new Date(bucketEnd);
      }
    });

    return Object.entries(buckets).map(([period, count]) => ({
      period,
      dues: count,
    }));
  };

  const timeData = createTimeBuckets(duesPaymentDates);
  const totalCount = timeData.reduce(
    (sum, item) => sum + (Number(item.dues) || 0),
    0,
  );

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Dues Payments Over Time</CardTitle>
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
              <Bar dataKey="dues" fill="var(--color-dues)" radius={4}>
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
            No dues payment data available
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Each bar represents a 1-week period
        </div>
        <div className="text-xs text-muted-foreground">
          Total dues payments: {totalCount}
        </div>
      </CardFooter>
    </Card>
  );
}
