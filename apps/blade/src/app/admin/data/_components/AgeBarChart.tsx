"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { InsertMember } from "@forge/db/schemas/knight-hacks";

import {
    Card,
    CardContent,
    CardFooter,
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
    let totalAge = 0;
    members.forEach(({ age }) => {
        if (age) {
          ageCounts[age] = (ageCounts[age] ?? 0) + 1;
          totalAge += age;
        }
    });
    const avgAge = totalAge / members.length;
    const ageData = Object.entries(ageCounts).map(([age, count]) => ({
        age: age,
        members: count
    }));

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Age</CardTitle>
      </CardHeader>
      <CardContent className="pb-0">
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
      <CardFooter className="flex-col items-center gap-2 font-medium text-l text-center">
        Average age: {avgAge}
      </CardFooter>
    </Card>
  );
}
