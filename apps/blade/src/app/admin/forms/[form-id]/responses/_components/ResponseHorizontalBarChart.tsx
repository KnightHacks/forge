"use client";

  import { Bar, BarChart, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
  import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
  import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@forge/ui/chart";
  import type { ChartConfig } from "@forge/ui/chart";

  interface ResponseHorizontalBarChartProps {
    question: string;
    responses: Array <{
        responseData: Array<{
            question: string;
            type: string;
            answer: any;
        }>;
    }>;
  }

  export function ResponseHorizontalBarChart({question, responses}: ResponseHorizontalBarChartProps) {
    // count how many times each option appears across all responses
    const optionCounts: Record<string, number> = {};

    responses.forEach((response) => {
        // find this question in the response data
        const questionData = response.responseData.find(q=> q.question === question);
        const answer = questionData?.answer;

        // handle array answers for checkbox questions
        if ( Array.isArray(answer)) {
            answer.forEach((option: string) => {
                optionCounts[option] = (optionCounts[option] ?? 0) + 1;
            });
        } else if (answer) {
            // handle single value answers
            optionCounts[answer] = (optionCounts[answer] ?? 0) + 1;
        }
    });

    // convert to recharts format and sort by count (highest first)
    const chartData = Object.entries(optionCounts)
        .map(([option,count]) => ({
            option: option,
            count: count,
        }))
        .sort((a,b) => b.count - a.count);

        const chartConfig = {
            count: {
                label: "Responses",
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
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ right: 25 }}
                    >
                        {/* horizontal grid lines only */}
                        <CartesianGrid horizontal={false} />
                        {/* y-axis shows the option names */}
                        <YAxis
                            dataKey="option"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            width={150}
                        />
                        {/* x-axis shows the count numbers */}
                        <XAxis
                            dataKey="count"
                            type="number"
                            domain={[0, 'dataMax']}
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
                            barSize={100}
                        >
                            {/* show count number on right of bar */}
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
            </CardContent>
        </Card>
        );
  }