"use client";

import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { useEffect, useMemo, useState } from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import { FORMS } from "@forge/consts";
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

interface Hacker {
  gradDate: Date | string;
}

interface LevelOfStudyPieProps {
  hackers: Hacker[];
  hackathonDate: Date | string;
}

/**
 * Render a pie chart showing the distribution of hackers by year of study relative to a hackathon date.
 *
 * The component groups hackers by computed levels ("Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Alumni", or "Unknown"
 * when dates are invalid) based on each hacker's `gradDate` compared to `hackathonDate`, and provides an interactive selector
 * to highlight a level and show its count.
 *
 * @param hackers - Array of hackers; each hacker's `gradDate` is used to determine their level of study.
 * @param hackathonDate - Date (or ISO date string) representing the hackathon date used as the reference year.
 * @returns The rendered pie chart component displaying counts per level of study.
 */
export default function LevelOfStudyPie({
  hackers,
  hackathonDate,
}: LevelOfStudyPieProps) {
  const id = "pie-interactive";

  // Calculate level of study based on graduation date relative to hackathon date
  const calculateLevelOfStudy = (
    gradDate: Date | string,
    hackathonDate: Date | string,
  ): string => {
    // Convert gradDate to Date object if it's a string
    const gradDateObj =
      typeof gradDate === "string" ? new Date(gradDate) : gradDate;
    const hackathonDateObj =
      typeof hackathonDate === "string"
        ? new Date(hackathonDate)
        : hackathonDate;

    // Check if dates are valid
    if (isNaN(gradDateObj.getTime()) || isNaN(hackathonDateObj.getTime())) {
      return "Unknown";
    }

    const gradYear = gradDateObj.getFullYear();
    const hackathonYear = hackathonDateObj.getFullYear();
    const yearsUntilGrad = gradYear - hackathonYear;

    if (yearsUntilGrad >= 4) return "Freshman";
    if (yearsUntilGrad >= 3) return "Sophomore";
    if (yearsUntilGrad >= 2) return "Junior";
    if (yearsUntilGrad >= 1) return "Senior";
    if (yearsUntilGrad >= 0) return "Graduate";
    return "Alumni";
  };

  // Get amount of each level
  const levelCounts: Record<string, number> = {};
  hackers.forEach((hacker) => {
    if (hacker.gradDate) {
      const level = calculateLevelOfStudy(hacker.gradDate, hackathonDate);
      levelCounts[level] = (levelCounts[level] ?? 0) + 1;
    }
  });

  const levelData = Object.entries(levelCounts).map(([level, count]) => ({
    name: level,
    amount: count,
  }));

  const [activeLevel, setActiveLevel] = useState(
    levelData[0] ? levelData[0].name : null,
  );

  const activeIndex = useMemo(
    () => levelData.findIndex((item) => item.name === activeLevel),
    [activeLevel, levelData],
  );

  const levelNames = useMemo(
    () => levelData.map((item) => item.name),
    [levelData],
  );

  // Set up chart config
  const baseConfig: ChartConfig = {
    people: { label: "people" },
  };
  let colorIdx = 0;
  levelData.forEach(({ name }) => {
    if (!baseConfig[name]) {
      baseConfig[name] = {
        label: name,
        color:
          FORMS.ADMIN_PIE_CHART_COLORS[
            colorIdx % FORMS.ADMIN_PIE_CHART_COLORS.length
          ],
      };
      colorIdx++;
    }
  });

  // Update selected pie chart segment if the data changes
  useEffect(() => {
    const activeStillExists = levelData.some(
      (item) => item.name === activeLevel,
    );

    if (levelData.length <= 0) {
      setActiveLevel(null);
      return;
    } else if (!activeStillExists && levelData[0]) {
      setActiveLevel(levelData[0].name);
    }
  }, [levelData, activeLevel]);

  return (
    <Card data-chart={id} className="flex flex-col pb-4">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Year of Study</CardTitle>
        </div>
        <Select
          value={activeLevel ? activeLevel : undefined}
          onValueChange={setActiveLevel}
        >
          <SelectTrigger
            className="ml-auto h-7 rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {levelNames.map((key) => {
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
              data={levelData}
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
                          {levelData[activeIndex]?.amount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          people
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
              {levelData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    FORMS.ADMIN_PIE_CHART_COLORS[
                      index % FORMS.ADMIN_PIE_CHART_COLORS.length
                    ]
                  }
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}