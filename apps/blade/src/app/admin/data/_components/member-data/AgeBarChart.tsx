"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";

const chartConfig = {
  people: {
    label: "people",
    color: "#4361ee",
  },
} satisfies ChartConfig;

interface Person {
  age?: number;
}

export default function AgeBarChart({ people }: { people: Person[] }) {
  const ageCounts: Record<number, number> = {};
  let totalAge = 0;
  let totalValidAges = 0;
  people.forEach(({ age }) => {
    // some people entered wrong birthday info and are negative ages
    if (age && age >= 13) {
      ageCounts[age] = (ageCounts[age] ?? 0) + 1;
      totalAge += age;
      totalValidAges++;
    }
  });
  const avgAge =
    totalValidAges > 0 ? (totalAge / totalValidAges).toFixed(2) : 0;
  const ageData = Object.entries(ageCounts).map(([age, count]) => ({
    age: age,
    people: count,
  }));

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Age</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer className="h-full w-full" config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={ageData}
            margin={{ top: 30, right: 0, left: 0, bottom: 0 }}
          >
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
            <Bar dataKey="people" fill="var(--color-people)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="invisible fill-foreground md:visible lg:visible"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-l flex-col items-center gap-2 text-center font-medium">
        <p>
          Average age: <span className="font-bold">{avgAge}</span>
        </p>
      </CardFooter>
    </Card>
  );
}
