"use client";

import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@forge/ui/chart";
import { RadialBarChart, PolarRadiusAxis, Label, RadialBar } from "recharts";

const chartData = [{ month: "january", dues: 1260, noDues: 570 }];

const chartConfig = {
    dues: {
      label: "Paid Dues",
      color: "hsl(var(--chart-1))",
    },
    noDues: {
      label: "Not Paid Dues",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

export default function MembersDuesRadialChart() {
    const totalMembers = chartData[0].dues + chartData[0].noDues;

    return (
        <div>
            <h2 className="text-xl font-extrabold text-center">
                All Members
            </h2>
            <ChartContainer className="mx-auto aspect-square w-full max-w-[250px]" config={chartConfig}>
                <RadialBarChart
                    data={chartData}
                    endAngle={180}
                    innerRadius={80}
                    outerRadius={130}
                >
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                    />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                        <Label 
                            content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                                            <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) - 16}
                                            className="fill-foreground text-2xl font-bold"
                                            >
                                                {totalMembers.toLocaleString()}
                                            </tspan>
                                            <tspan
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 4}
                                            className="fill-muted-foreground"
                                            >
                                                Members
                                            </tspan>
                                        </text>
                                    );
                                }
                            }}  
                        />
                    </PolarRadiusAxis>
                    <RadialBar 
                    dataKey="dues"
                    stackId="a"
                    cornerRadius={5}
                    fill="#3b2fc2"
                    className="stroke-transparent stroke-2"
                    />
                    <RadialBar 
                    dataKey="noDues"
                    fill="#eb6390"
                    stackId="a"
                    cornerRadius={5}
                    className="stroke-transparent stroke-2"
                    />
                </RadialBarChart>
            </ChartContainer>
        </div>
    );
}