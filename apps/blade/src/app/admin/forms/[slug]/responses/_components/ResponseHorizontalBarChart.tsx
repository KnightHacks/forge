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

  // calculate dynamic height based on number of items (28px per bar on mobile, 40px on desktop)
  const mobileChartHeight = Math.max(180, chartData.length * 28);
  const desktopChartHeight = Math.max(250, chartData.length * 40);

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
      {/* center the chart horizontally and make scrollable */}
      <CardContent className="flex flex-col items-center justify-center px-3 pb-3 pt-0 md:px-6 md:pb-6 md:pt-6">
        {/* Mobile view - compact horizontal bar chart */}
        <div className="max-h-[300px] w-full overflow-y-auto overflow-x-hidden md:hidden">
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: `${mobileChartHeight}px` }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ right: 25, left: 5, top: 5, bottom: 5 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="option"
                type="category"
                tickLine={false}
                tickMargin={4}
                axisLine={false}
                width={100}
                className="text-[10px] leading-tight"
                tickFormatter={(value: string, index: number) => {
                  const data = chartData[index];
                  return `(${data?.percentage}%) ${value}`;
                }}
              />
              <XAxis
                dataKey="count"
                type="number"
                domain={[0, "dataMax"]}
                hide
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={4}
                layout="vertical"
                barSize={22}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={4}
                  className="fill-foreground text-[10px]"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Desktop view - original horizontal bar chart */}
        <div className="hidden max-h-[500px] w-full overflow-y-auto md:block">
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: `${desktopChartHeight}px` }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ right: 25, left: 0, top: 5, bottom: 5 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="option"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={200}
                className="text-sm"
                tickFormatter={(value: string, index: number) => {
                  const data = chartData[index];
                  return `(${data?.percentage}%) ${value}`;
                }}
              />
              <XAxis
                dataKey="count"
                type="number"
                domain={[0, "dataMax"]}
                hide
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={4}
                layout="vertical"
                barSize={30}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
