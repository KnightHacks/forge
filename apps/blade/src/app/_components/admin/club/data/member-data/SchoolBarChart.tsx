"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import type { FORMS } from "@forge/consts";
import type { ChartConfig } from "@forge/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { ChartContainer, ChartTooltip } from "@forge/ui/chart";

const chartConfig = {
  members: {
    label: "members",
    color: "#4361ee",
  },
} satisfies ChartConfig;

interface Member {
  school?: (typeof FORMS.SCHOOLS)[number];
}

export default function SchoolBarChart({ members }: { members: Member[] }) {
  const schoolCounts: Record<string, number> = {};

  members.forEach(({ school }) => {
    if (school) {
      schoolCounts[school] = (schoolCounts[school] ?? 0) + 1;
    }
  });

  // Get top 10 schools by count, sorted highest to lowest for display
  const schoolData = Object.entries(schoolCounts)
    .map(([school, count]) => ({
      school: school.length > 35 ? school.substring(0, 35) + "..." : school, // Truncate long school names
      fullSchool: school,
      members: count,
    }))
    .sort((a, b) => b.members - a.members) // Sort by count descending (highest at top)
    .slice(0, 10); // Show only top 10

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Schools</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {schoolData.length > 0 ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={schoolData}
              layout="vertical"
              margin={{ top: 20, right: 50, left: 0, bottom: 20 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="school"
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
                      fullSchool: string;
                      members: number;
                    };
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{data.fullSchool}</div>
                          <div className="text-sm text-muted-foreground">
                            {data.members} member{data.members !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="members"
                fill="var(--color-members)"
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="members"
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
            No school data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
