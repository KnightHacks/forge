"use client";

import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { useEffect, useMemo, useState } from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";

import type { ChartConfig } from "@forge/ui/chart";
import {
  ADMIN_PIE_CHART_COLORS,
  LEVELS_OF_STUDY,
  SHORT_LEVELS_OF_STUDY,
} from "@forge/consts/knight-hacks";
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
  levelOfStudy?: (typeof LEVELS_OF_STUDY)[number];
}

const shortenLevelOfStudy = (levelOfStudy: string): string => {
  const replacements: Record<string, string> = {
    // Undergraduate University (2 year - community college or similar)
    [LEVELS_OF_STUDY[2]]: SHORT_LEVELS_OF_STUDY[0], // Undergraduate University (2 year)
    // Graduate University (Masters, Professional, Doctoral, etc)
    [LEVELS_OF_STUDY[4]]: SHORT_LEVELS_OF_STUDY[1], // Graduate University (Masters/PhD)
    // Other Vocational / Trade Program or Apprenticeship
    [LEVELS_OF_STUDY[6]]: SHORT_LEVELS_OF_STUDY[2], // Vocational/Trade School
  };
  return replacements[levelOfStudy] ?? levelOfStudy;
};

export default function SchoolYearPie({ people }: { people: Person[] }) {
  const id = "pie-interactive";

  // set up school year data
  const levelOfStudyCounts: Record<string, number> = {};
  people.forEach(({ levelOfStudy }) => {
    if (levelOfStudy) {
      levelOfStudyCounts[levelOfStudy] =
        (levelOfStudyCounts[levelOfStudy] ?? 0) + 1;
    }
  });
  const levelOfStudyData = Object.entries(levelOfStudyCounts).map(
    ([levelOfStudy, count]) => ({
      name: shortenLevelOfStudy(levelOfStudy),
      amount: count,
    }),
  );

  const [activeLevel, setActiveLevel] = useState(
    levelOfStudyData[0] ? levelOfStudyData[0].name : null,
  );

  const activeIndex = useMemo(
    () => levelOfStudyData.findIndex((item) => item.name === activeLevel),
    [activeLevel, levelOfStudyData],
  );
  const studyLevels = useMemo(
    () => levelOfStudyData.map((item) => item.name),
    [levelOfStudyData],
  );

  // set up chart config
  const baseConfig: ChartConfig = {
    people: { label: "people" },
  };
  let colorIdx = 0;
  people.forEach(({ levelOfStudy }) => {
    const shortenedString = levelOfStudy
      ? shortenLevelOfStudy(levelOfStudy)
      : undefined;
    if (shortenedString && !baseConfig[shortenedString]) {
      baseConfig[shortenedString] = {
        label: shortenedString,
        color: ADMIN_PIE_CHART_COLORS[colorIdx % ADMIN_PIE_CHART_COLORS.length],
      };
      colorIdx++;
    }
  });

  // update selected pie chart segment if the data changes
  useEffect(() => {
    const activeStillExists = levelOfStudyData.some(
      (item) => item.name === activeLevel,
    );

    if (levelOfStudyData.length <= 0) {
      setActiveLevel(null);
      return;
    } else if (!activeStillExists && levelOfStudyData[0]) {
      setActiveLevel(levelOfStudyData[0].name);
    }
  }, [levelOfStudyData, activeLevel]);

  return (
    <Card data-chart={id} className="flex flex-col pb-4">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Level of Study</CardTitle>
        </div>
        <Select
          value={activeLevel ? activeLevel : undefined}
          onValueChange={setActiveLevel}
        >
          <SelectTrigger
            className="ml-auto h-7 rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {studyLevels.map((key) => {
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
              data={levelOfStudyData}
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
                          {levelOfStudyData[
                            activeIndex
                          ]?.amount.toLocaleString()}
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
              {levelOfStudyData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    ADMIN_PIE_CHART_COLORS[
                      index % ADMIN_PIE_CHART_COLORS.length
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
