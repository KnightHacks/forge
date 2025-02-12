"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
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
        // some people entered wrong birthday info and are negative ages
        if (age && age >= 13) {
          ageCounts[age] = (ageCounts[age] ?? 0) + 1;
          totalAge += age;
        }
    });
    const avgAge = (totalAge / members.length).toFixed(2);
    const ageData = Object.entries(ageCounts).map(([age, count]) => ({
        age: age,
        members: count
    }));

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Age</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer className="h-full w-full" config={chartConfig}>
          <BarChart accessibilityLayer data={ageData} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
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
            <Bar dataKey="members" fill="var(--color-members)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground invisible lg:visible md:visible"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-center gap-2 font-medium text-l text-center">
        <p>Average age: <span className="font-bold">{avgAge}</span></p>
      </CardFooter>
    </Card>
  );
}
