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
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

interface ResponseHorizontalBarChartProps {
  question: string;
  responses: {
    responseData: Record<string, unknown>;
  }[];
}

export function ResponseHorizontalBarChart({
  question,
  responses,
}: ResponseHorizontalBarChartProps) {
  // count how many times each option appears across all responses
  const optionCounts: Record<string, number> = {};

  responses.forEach((response) => {
    // get answer directly from responseData object
    const answer = response.responseData[question];

    // handle array answers for checkbox questions
    if (Array.isArray(answer)) {
      answer.forEach((option) => {
        const optionStr =
          typeof option === "string" ? option : JSON.stringify(option);
        optionCounts[optionStr] = (optionCounts[optionStr] ?? 0) + 1;
      });
    } else if (answer) {
      // handle single value answers
      let answerStr: string;
      if (typeof answer === "string") {
        answerStr = answer;
      } else if (typeof answer === "object") {
        answerStr = JSON.stringify(answer);
      } else {
        // for primitive types (number, boolean, etc.) - safe to stringify
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        answerStr = String(answer);
      }
      optionCounts[answerStr] = (optionCounts[answerStr] ?? 0) + 1;
    }
  });

  // calculate total responses for percentage calculations
  const totalResponses = Object.values(optionCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  // convert to recharts format and sort by count (highest first)
  const chartData = Object.entries(optionCounts)
    .map(([option, count]) => ({
      option: option,
      count: count,
      percentage: ((count / totalResponses) * 100).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);

  const chartConfig = {
    count: {
      label: "Responses",
      color: "#4361ee",
    },
  } satisfies ChartConfig;

  // calculate dynamic height based on number of items (40px per bar)
  const chartHeight = Math.max(300, chartData.length * 40);

  return (
    <Card>
      <CardHeader>
        {/* question text as card title */}
        <CardTitle>{question}</CardTitle>
        {/* show total number of responses */}
        <p className="mt-1 text-sm text-muted-foreground">
          {responses.length} {responses.length === 1 ? "response" : "responses"}
        </p>
      </CardHeader>
      {/* center the chart horizontally and make scrollable */}
      <CardContent className="flex flex-col items-center justify-center">
        <div className="max-h-[500px] w-full overflow-y-auto">
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: `${chartHeight}px` }}
          >
            <BarChart data={chartData} layout="vertical" margin={{ right: 25 }}>
              {/* horizontal grid lines only */}
              <CartesianGrid horizontal={false} />
              {/* y-axis shows the option names with percentages */}
              <YAxis
                dataKey="option"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={200}
                tickFormatter={(value: string, index: number) => {
                  const data = chartData[index];
                  return `(${data?.percentage}%) ${value}`;
                }}
              />
              {/* x-axis shows the count numbers */}
              <XAxis
                dataKey="count"
                type="number"
                domain={[0, "dataMax"]}
                hide
              />
              {/* tooltip shown on hover */}
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              {/* render horizontal bars */}
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={4}
                layout="vertical"
                barSize={30}
              >
                {/* show count on right of bar */}
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  fontSize={12}
                  className="fill-foreground"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
