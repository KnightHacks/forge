"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { InsertMember } from "@forge/db/schemas/knight-hacks";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@forge/ui/card";

import type {
    ChartConfig} from "@forge/ui/chart";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@forge/ui/chart";

const chartConfig = {
  members: {
    label: "Members",
    color: "#4361ee"
  },
} satisfies ChartConfig;

export default function AgeBarChart({ members } : { members : InsertMember[] }) {
    const ageCounts: Record<number, number> = {};
    members.forEach(({ age }) => {
        if (age) ageCounts[age] = (ageCounts[age] ?? 0) + 1;
    });
    const ageData = Object.entries(ageCounts).map(([age, count]) => ({
        age: age,
        members: count
    }));
    console.log(ageData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
            <text className="text-xl">Age Distribution</text>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={ageData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="age"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="members" fill="var(--color-members)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
