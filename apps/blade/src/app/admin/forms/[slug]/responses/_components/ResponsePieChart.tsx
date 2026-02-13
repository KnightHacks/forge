// pie chart component for displaying categorical/multiple choice question responses
// used for questions like "what is your favorite programming language?"
"use client";

import { Cell, Pie, PieChart } from "recharts";

import { FORMS } from "@forge/consts";
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
      if (typeof answer === "boolean") {
        // convert boolean to "Yes" or "No" for display
        answerStr = answer ? "Yes" : "No";
      } else if (typeof answer === "string") {
        // convert "true"/"false" strings to "Yes"/"No" for boolean questions
        if (answer === "true") {
          answerStr = "Yes";
        } else if (answer === "false") {
          answerStr = "No";
        } else {
          answerStr = answer;
        }
      } else if (typeof answer === "object") {
        answerStr = JSON.stringify(answer);
      } else {
        // for primitive types (number, etc.) - safe to stringify
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
        FORMS.ADMIN_PIE_CHART_COLORS[
          index % FORMS.ADMIN_PIE_CHART_COLORS.length
        ] ?? "#000000",
    };
  });

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
      {/* center the chart horizontally using flexbox, stack vertically on mobile */}
      <CardContent className="flex flex-col items-center justify-center px-3 pb-3 pt-0 md:flex-row md:px-6 md:pb-6 md:pt-6">
        {/* Mobile view - smaller pie chart */}
        <div className="flex w-full items-center overflow-hidden md:hidden">
          <ChartContainer config={chartConfig} className="h-[140px] w-full">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend
                content={({ payload }) => {
                  if (!payload?.length) return null;

                  return (
                    <div className="flex max-h-[130px] flex-col gap-1 overflow-y-auto pr-0.5">
                      {payload.map((item, index) => {
                        const chartItem = chartData.find(
                          (d) => d.name === item.value,
                        );
                        const percentage = chartItem?.percentage ?? "0.0";

                        return (
                          <div key={index} className="flex items-center gap-1">
                            <div
                              className="h-2 w-2 flex-shrink-0 rounded-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[10px] leading-tight">
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
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                cx="32%"
                cy="50%"
                innerRadius={0}
                outerRadius={55}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      FORMS.ADMIN_PIE_CHART_COLORS[
                        index % FORMS.ADMIN_PIE_CHART_COLORS.length
                      ]
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* Desktop view - original size pie chart */}
        <ChartContainer
          config={chartConfig}
          className="hidden h-[300px] md:block"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend
              content={({ payload }) => {
                if (!payload?.length) return null;

                return (
                  <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-2">
                    {payload.map((item, index) => {
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
            <Pie data={chartData} dataKey="amount" nameKey="name">
              {/* apply colors to each slice */}
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    FORMS.ADMIN_PIE_CHART_COLORS[
                      index % FORMS.ADMIN_PIE_CHART_COLORS.length
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
