"use client"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@forge/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { ADMIN_PIE_CHART_COLORS } from "@forge/consts/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

interface ResponsePieChartProps { 
    question: string;
    responses: Array <{
        responseData: Record<string, any>;
    }>;
}

export function ResponsePieChart ({ question, responses }: ResponsePieChartProps ){
    const answerCounts: Record<string, number> = {};
    responses.forEach((response) => {
        const answer = response.responseData[question];
        if ( answer ){
            answerCounts[answer] = (answerCounts[answer] ?? 0) + 1;
        }
    });

    const chartData = Object.entries(answerCounts).map(([answer, count]) => ({
        name: answer,
        amount: count,
    }));

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
            <CardTitle>{question}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={chartData} dataKey="amount" nameKey="name">
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
