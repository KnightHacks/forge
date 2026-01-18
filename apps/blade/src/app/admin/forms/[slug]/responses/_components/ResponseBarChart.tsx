// bar chart component for displaying numeric/linear scale question responses
// used for questions like "rate your experience 1-5" or "years of experience"
"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

// props - expects a question string and array of responses
interface ResponseBarChartProps {
  question: string;
  responses: {
    responseData: Record<string, unknown>;
  }[];
}

export function ResponseBarChart({
  question,
  responses,
}: ResponseBarChartProps) {
  // count how many times each numeric value appears
  // creates object like { 1: 2, 2: 1, 3: 3, 4: 2, 5: 1 }
  const answerCounts: Record<number, number> = {};
  responses.forEach((response) => {
    // get answer directly from responseData object
    const answer = response.responseData[question];
    if (answer !== undefined && answer !== null) {
      // increment count for this numeric value
      const numericAnswer = Number(answer);
      if (!Number.isNaN(numericAnswer)) {
        answerCounts[numericAnswer] = (answerCounts[numericAnswer] ?? 0) + 1;
      }
    }
  });

  // calculate total responses for percentage calculations
  const totalResponses = Object.values(answerCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  // convert to format recharts expects and add percentage field
  // [{ value: 1, count: 2, percentage: "33.3" }, { value: 2, count: 1, percentage: "16.7" }, ...]
  const chartData = Object.entries(answerCounts).map(([value, count]) => ({
    value: Number(value),
    count: count,
    percentage: ((count / totalResponses) * 100).toFixed(1),
  }));

  // calculate average of all numeric responses
  const totalValues = chartData.reduce(
    (sum, item) => sum + item.value * item.count,
    0,
  );
  const average =
    totalResponses > 0 ? (totalValues / totalResponses).toFixed(1) : 0;

  // configure bar color
  const chartConfig = {
    count: {
      label: "Response",
      color: "#4361ee",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 md:pb-6 md:pt-6">
        {/* question text as card title */}
        <CardTitle className="whitespace-pre-line text-sm md:text-lg">
          {question}
        </CardTitle>
        {/* show total number of responses */}
        <p className="mt-0.5 text-[10px] text-muted-foreground md:mt-1 md:text-sm">
          {responses.length} {responses.length === 1 ? "response" : "responses"}
        </p>
      </CardHeader>
      {/* center the chart horizontally and add legend on the right, stack vertically on mobile */}
      <CardContent className="flex flex-col items-center justify-center px-3 pb-3 pt-0 md:flex-row md:px-6 md:pb-6 md:pt-6">
        <ChartContainer config={chartConfig} className="h-[130px] md:h-[300px]">
          <BarChart data={chartData} margin={{ top: 20, bottom: 0 }}>
            {/* horizontal grid lines only */}
            <CartesianGrid vertical={false} />
            {/* x-axis shows the numeric values (1, 2, 3, etc) */}
            <XAxis
              dataKey="value"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              className="text-xs md:text-sm"
            />
            {/* tooltip shown on hover */}
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            {/* render the bars with rounded corners */}
            <Bar dataKey="count" fill="var(--color-count)" radius={8}>
              {/* show count number on top of each bar */}
              <LabelList position="top" offset={8} className="text-xs" />
            </Bar>
          </BarChart>
        </ChartContainer>
        {/* legend container with scrollable items and fixed average */}
        <div className="mt-3 flex w-full flex-col md:ml-6 md:mt-0 md:w-auto">
          {/* scrollable legend items */}
          <div className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto pr-2 md:max-h-[240px] md:gap-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: "#4361ee" }}
                />
                <span className="text-xs md:text-sm">
                  {item.value}: {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
          {/* fixed average value below scrollable area */}
          <div className="mt-2 border-t pt-2">
            <p className="text-xs font-medium md:text-sm">avg: {average}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
