// pie chart component for displaying categorical/multiple choice question responses
// used for questions like "what is your favorite programming language?"
"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ADMIN_PIE_CHART_COLORS } from "@forge/consts/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

// props - expects a question string and array of responses
interface ResponsePieChartProps {
  question: string;
  responses: {
    responseData: Record<string, unknown>;
  }[];
}

export function ResponsePieChart({
  question,
  responses,
}: ResponsePieChartProps) {
  // count how many times each answer appears
  // creates object like { "javascript": 3, "python": 2, "typescript": 1 }
  const answerCounts: Record<string, number> = {};
  responses.forEach((response) => {
    // get answer directly from responseData object
    const answer = response.responseData[question];
    if (answer !== undefined && answer !== null) {
      // increment count for this answer
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
      answerCounts[answerStr] = (answerCounts[answerStr] ?? 0) + 1;
    }
  });

  const totalResponses = Object.values(answerCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  // convert answer counts to format recharts expects
  // [{ name: "javascript", amount: 3 }, { name: "python", amount: 2 }]
  const chartData = Object.entries(answerCounts)
    .map(([answer, count]) => ({
      name: answer,
      amount: count,
      percentage: ((count / totalResponses) * 100).toFixed(1),
    }))
    .sort((a, b) => b.amount - a.amount);

  // assign colors to each answer option
  // uses color palette from consts, cycles through if more options than colors
  const chartConfig: Record<string, { label: string; color: string }> = {};
  chartData.forEach((item, index) => {
    chartConfig[item.name] = {
      label: item.name,
      color:
        ADMIN_PIE_CHART_COLORS[index % ADMIN_PIE_CHART_COLORS.length] ??
        "#000000",
    };
  });

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
      {/* center the chart horizontally using flexbox */}
      <CardContent className="flex items-center justify-center">
        <ChartContainer config={chartConfig} className="h-[300px]">
          <PieChart>
            {/* tooltip shown on hover */}
            <ChartTooltip content={<ChartTooltipContent />} />
            {/* custom vertical legend on the right side */}
            {/* shows colored box + label for each answer option */}
            <ChartLegend
              content={({ payload }) => {
                if (!payload?.length) return null;

                return (
                  <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-2">
                    {payload.map((item, index) => {
                      // find matching chartData item to get percentage
                      const chartItem = chartData.find(
                        (d) => d.name === item.value,
                      );
                      const percentage = chartItem?.percentage ?? "0.0";

                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm">
                            {item.value} ({percentage}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
              verticalAlign="middle"
              align="right"
              layout="vertical"
            />
            {/* render the actual pie chart */}
            <Pie data={chartData} dataKey="amount" nameKey="name">
              {/* apply colors to each slice */}
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    ADMIN_PIE_CHART_COLORS[
                      index % ADMIN_PIE_CHART_COLORS.length
                    ]
                  }
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
