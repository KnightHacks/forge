// bar chart component for displaying numeric/linear scale question responses
// used for questions like "rate your experience 1-5" or "years of experience"
"use client";

import { Bar, BarChart, CartesianGrid, Label, LabelList, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@forge/ui/chart";
import type { ChartConfig } from "@forge/ui/chart";

// props - expects a question string and array of responses
interface ResponseBarChartProps {
    question: string;
    responses: Array <{
        responseData: Array <{
            question: string;
            type: string;
            answer: any;
        }>
    }>;
}

export function ResponseBarChart({ question, responses }: ResponseBarChartProps) {

    // count how many times each numeric value appears
    // creates object like { 1: 2, 2: 1, 3: 3, 4: 2, 5: 1 }
    const answerCounts: Record<number, number> = {};
    responses.forEach((response) => {
        // find this question in the response data
        const questionData = response.responseData.find(q => q.question === question);
        const answer = questionData?.answer;
        if ( answer !== undefined && answer !== null){
            // increment count for this numeric value
            answerCounts[answer] = (answerCounts[answer] ?? 0) + 1;
        }
    });

    // convert to format recharts expects
    // [{ value: 1, count: 2 }, { value: 2, count: 1 }, ...]
    const chartData = Object.entries(answerCounts).map(([value,count]) => ({
        value: Number(value),
        count: count,
    }));

    // calculate average of all numeric responses
    const totalValues = chartData.reduce((sum, item) => sum + (item.value * item.count), 0);
    const totalResponses = chartData.reduce((sum, item) => sum + item.count, 0);
    const average = totalResponses > 0 ? (totalValues / totalResponses).toFixed(1) : 0;

    // configure bar color
    const chartConfig = {
        count: {
            label: "Response",
            color: "#4361ee",
        },
    } satisfies ChartConfig;

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
            {/* center the chart horizontally */}
            <CardContent className="flex flex-col items-center justify-center">
                <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data = {chartData} margin={{ top: 30 }}>
                        {/* horizontal grid lines only */}
                        <CartesianGrid vertical={false} />
                        {/* x-axis shows the numeric values (1, 2, 3, etc) */}
                        <XAxis
                            dataKey="value"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        {/* tooltip shown on hover */}
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        {/* render the bars with rounded corners */}
                        <Bar dataKey="count" fill="var(--color-count)" radius={8}>
                            {/* show count number on top of each bar */}
                            <LabelList position="top" offset={12} fontSize={12} />
                        </Bar>
                    </BarChart>
                </ChartContainer>
                {/* show average value below the chart */}
                <p className="text-md font-medium mt-4">
                    average: {average}
                </p>
            </CardContent>
        </Card>
    );
}