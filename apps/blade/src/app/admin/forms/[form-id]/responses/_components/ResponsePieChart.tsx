// pie chart component for displaying categorical/multiple choice question responses
// used for questions like "what is your favorite programming language?"
"use client"

import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@forge/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { ADMIN_PIE_CHART_COLORS } from "@forge/consts/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

// props - expects a question string and array of responses
interface ResponsePieChartProps {
    question: string;
    responses: Array <{
        responseData: Array<{
            question: string;
            type: string;
            answer: any;
        }>;
    }>;
}

export function ResponsePieChart ({ question, responses }: ResponsePieChartProps ){
    // count how many times each answer appears
    // creates object like { "javascript": 3, "python": 2, "typescript": 1 }
    const answerCounts: Record<string, number> = {};
    responses.forEach((response) => {
        // find this question in the response data
        const questionData = response.responseData.find(q => q.question === question);
        const answer = questionData?.answer;
        if ( answer ){
            // increment count for this answer
            answerCounts[answer] = (answerCounts[answer] ?? 0) + 1;
        }
    });

    const totalResponses = Object.values(answerCounts).reduce((sum,count) => sum + count, 0);
    // convert answer counts to format recharts expects
    // [{ name: "javascript", amount: 3 }, { name: "python", amount: 2 }]
    const chartData = Object.entries(answerCounts).map(([answer, count]) => ({
        name: answer,
        amount: count,
        percentage: ((count / totalResponses ) * 100).toFixed(1), 
    }))
    .sort((a,b) => b.amount - a.amount); 

    // assign colors to each answer option
    // uses color palette from consts, cycles through if more options than colors
    const chartConfig: Record<string, { label: string; color: string }> = {};
    chartData.forEach((item, index) => {
        chartConfig[item.name] = {
            label: item.name,
            color: ADMIN_PIE_CHART_COLORS[index % ADMIN_PIE_CHART_COLORS.length] ?? "#000000",
        }
    });

    

    return (
        <Card>
          <CardHeader>
            {/* question text as card title */}
            <CardTitle>{question}</CardTitle>
            {/* show total number of responses */}
            <p className="text-sm text-muted-foreground mt-1">
                {responses.length} {responses.length === 1 ? 'response' : 'responses'}
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
                          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-2">
                            {payload.map((item, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                 <span className="text-sm">{item.value} ({item.payload.percentage}%)</span>
                              </div>
                            ))}
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
                      fill={ADMIN_PIE_CHART_COLORS[index % ADMIN_PIE_CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
    );
}
