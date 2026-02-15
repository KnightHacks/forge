"use client";

import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { useEffect, useMemo, useState } from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@forge/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

interface Person {
  isFirstTime?: boolean | null;
}

export default function FirstTimeHackersPie({ people }: { people: Person[] }) {
  const id = "pie-interactive";

  // Count first-time vs returning hackers
  let firstTimeCount = 0;
  let returningCount = 0;
  let unknownCount = 0;

  people.forEach(({ isFirstTime }) => {
    if (isFirstTime === true) {
      firstTimeCount++;
    } else if (isFirstTime === false) {
      returningCount++;
    } else {
      unknownCount++;
    }
  });

  const experienceData = [
    { name: "First-time Hackers", amount: firstTimeCount, color: "#22c55e" },
    { name: "Returning Hackers", amount: returningCount, color: "#ef4444" },
    ...(unknownCount > 0
      ? [{ name: "Unknown", amount: unknownCount, color: "#6b7280" }]
      : []),
  ].filter((item) => item.amount > 0);

  const [activeLevel, setActiveLevel] = useState(
    experienceData[0] ? experienceData[0].name : null,
  );

  const activeIndex = useMemo(
    () => experienceData.findIndex((item) => item.name === activeLevel),
    [activeLevel, experienceData],
  );
  const experienceTypes = useMemo(
    () => experienceData.map((item) => item.name),
    [experienceData],
  );

  // set up chart config
  const baseConfig: ChartConfig = {
    people: { label: "people" },
  };
  experienceData.forEach((item) => {
    baseConfig[item.name] = {
      label: item.name,
      color: item.color,
    };
  });

  // update selected pie chart segment if the data changes
  useEffect(() => {
    const activeStillExists = experienceData.some(
      (item) => item.name === activeLevel,
    );

    if (experienceData.length <= 0) {
      setActiveLevel(null);
      return;
    } else if (!activeStillExists && experienceData[0]) {
      setActiveLevel(experienceData[0].name);
    }
  }, [experienceData, activeLevel]);

  const totalHackers = people.length;
  const firstTimePercentage =
    totalHackers > 0 ? ((firstTimeCount / totalHackers) * 100).toFixed(1) : 0;

  return (
    <Card data-chart={id} className="flex flex-col pb-4">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Hacker Experience</CardTitle>
          <p className="text-sm text-muted-foreground">
            {firstTimePercentage}% are first-time hackers
          </p>
        </div>
        <Select
          value={activeLevel ? activeLevel : undefined}
          onValueChange={setActiveLevel}
        >
          <SelectTrigger
            className="ml-auto h-7 rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select experience type" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {experienceTypes.map((key) => {
              const config = baseConfig[key];

              if (!config) {
                return null;
              }

              return (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: config.color,
                      }}
                    />
                    {config.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="mt-4 flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={baseConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={experienceData}
              dataKey="amount"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {experienceData[activeIndex]?.amount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Hackers
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
              {experienceData.map((item, index) => (
                <Cell key={`cell-${index}`} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
