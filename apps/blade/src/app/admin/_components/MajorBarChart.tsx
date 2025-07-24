"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import type { MAJORS } from "@forge/consts/knight-hacks";
import type { ChartConfig } from "@forge/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { ChartContainer, ChartTooltip } from "@forge/ui/chart";

const chartConfig = {
  people: {
    label: "people",
    color: "#4361ee",
  },
} satisfies ChartConfig;

interface Person {
  major?: (typeof MAJORS)[number];
}

export default function MajorBarChart({ people }: { people: Person[] }) {
  const majorCounts: Record<string, number> = {};

  people.forEach(({ major }) => {
    if (major) {
      majorCounts[major] = (majorCounts[major] ?? 0) + 1;
    }
  });

  // Get top 10 majors by count, sorted highest to lowest for display
  const majorData = Object.entries(majorCounts)
    .map(([major, count]) => ({
      major: major.length > 35 ? major.substring(0, 35) + "..." : major, // Truncate long major names
      fullMajor: major,
      people: count,
    }))
    .sort((a, b) => b.people - a.people) // Sort by count descending (highest at top)
    .slice(0, 10); // Show only top 10

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Majors of Study</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {majorData.length > 0 ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={majorData}
              layout="vertical"
              margin={{ top: 20, right: 50, left: 0, bottom: 20 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="major"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={11}
                width={150}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload?.[0]?.payload) {
                    const data = payload[0].payload as {
                      fullMajor: string;
                      people: number;
                    };
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{data.fullMajor}</div>
                          <div className="text-sm text-muted-foreground">
                            {data.people}{" "}
                            {data.people !== 1 ? "people" : "person"}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="people"
                fill="var(--color-people)"
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="people"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No major data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
