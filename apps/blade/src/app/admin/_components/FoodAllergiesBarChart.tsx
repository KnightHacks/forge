"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
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
  foodAllergies?: string | null;
}

export default function FoodAllergiesBarChart({
  people,
}: {
  people: Person[];
}) {
  const allergyCounts: Record<string, number> = {};

  people.forEach(({ foodAllergies }) => {
    if (foodAllergies && foodAllergies.trim() !== "") {
      // Split by common delimiters and clean up
      const allergies = foodAllergies
        .split(/[,;/\n]/)
        .map((allergy) => allergy.trim().toLowerCase())
        .filter(
          (allergy) =>
            allergy !== "" && allergy !== "none" && allergy !== "n/a",
        );

      if (allergies.length > 0) {
        allergies.forEach((allergy) => {
          // Normalize common allergy names
          let normalizedAllergy = allergy;
          if (allergy.includes("peanut")) normalizedAllergy = "peanuts";
          else if (allergy.includes("tree nut") || allergy.includes("nuts"))
            normalizedAllergy = "tree nuts";
          else if (
            allergy.includes("dairy") ||
            allergy.includes("milk") ||
            allergy.includes("lactose")
          )
            normalizedAllergy = "dairy/lactose";
          else if (allergy.includes("gluten") || allergy.includes("wheat"))
            normalizedAllergy = "gluten/wheat";
          else if (allergy.includes("shellfish"))
            normalizedAllergy = "shellfish";
          else if (allergy.includes("egg")) normalizedAllergy = "eggs";
          else if (allergy.includes("soy")) normalizedAllergy = "soy";
          else if (allergy.includes("fish")) normalizedAllergy = "fish";
          else if (allergy.includes("sesame")) normalizedAllergy = "sesame";

          allergyCounts[normalizedAllergy] =
            (allergyCounts[normalizedAllergy] ?? 0) + 1;
        });
      }
    }
  });

  const allergyData = Object.entries(allergyCounts)
    .map(([allergy, count]) => ({
      allergy: allergy.charAt(0).toUpperCase() + allergy.slice(1),
      people: count,
    }))
    .sort((a, b) => b.people - a.people); // Sort by count descending (highest at top)

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-xl">Food Allergies</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {allergyData.length > 0 ? (
          <ChartContainer className="h-full w-full" config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={allergyData}
              layout="vertical"
              margin={{ top: 20, right: 50, left: 0, bottom: 20 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="allergy"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={12}
                width={100}
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
                content={<ChartTooltipContent hideLabel />}
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
            No food allergies reported
          </div>
        )}
      </CardContent>
    </Card>
  );
}
