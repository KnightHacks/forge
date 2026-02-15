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

interface Person {
  raceOrEthnicity?: (typeof FORMS.RACES_OR_ETHNICITIES)[number];
}

const shortenRaceOrEthnicity = (raceOrEthnicity: string): string => {
  const replacements: Record<string, string> = {
    // Native Hawaiian or Other Pacific Islander
    [FORMS.RACES_OR_ETHNICITIES[4]]: FORMS.SHORT_RACES_AND_ETHNICITIES[0], // Native Hawaiian/Pacific Islander
    // Hispanic / Latino / Spanish Origin
    [FORMS.RACES_OR_ETHNICITIES[2]]: FORMS.SHORT_RACES_AND_ETHNICITIES[1], // Hispanic/Latino
    // Native American or Alaskan Native
    [FORMS.RACES_OR_ETHNICITIES[5]]: FORMS.SHORT_RACES_AND_ETHNICITIES[2], // Native American/Alaskan Native
  };
  return replacements[raceOrEthnicity] ?? raceOrEthnicity;
};

export default function RaceOrEthnicityPie({ people }: { people: Person[] }) {
  const id = "pie-interactive";

  // get amount of each raceOrEthnicity
  const raceOrEthnicityCounts: Record<string, number> = {};
  people.forEach(({ raceOrEthnicity }) => {
    if (raceOrEthnicity)
      raceOrEthnicityCounts[raceOrEthnicity] =
        (raceOrEthnicityCounts[raceOrEthnicity] ?? 0) + 1;
  });
  const raceOrEthnicityData = Object.entries(raceOrEthnicityCounts).map(
    ([raceOrEthnicity, count]) => ({
      name: shortenRaceOrEthnicity(raceOrEthnicity),
      amount: count,
    }),
  );

  const [activeLevel, setActiveLevel] = useState(
    raceOrEthnicityData[0] ? raceOrEthnicityData[0].name : null,
  );

  const activeIndex = useMemo(
    () => raceOrEthnicityData.findIndex((item) => item.name === activeLevel),
    [activeLevel, raceOrEthnicityData],
  );
  const raceNames = useMemo(
    () => raceOrEthnicityData.map((item) => item.name),
    [raceOrEthnicityData],
  );

  // set up chart config
  const baseConfig: ChartConfig = {
    people: { label: "people" },
  };
  let colorIdx = 0;
  people.forEach(({ raceOrEthnicity }) => {
    if (raceOrEthnicity) {
      const shortenedString = shortenRaceOrEthnicity(raceOrEthnicity);
      if (!baseConfig[shortenedString]) {
        baseConfig[shortenedString] = {
          label: shortenedString,
          color:
            FORMS.ADMIN_PIE_CHART_COLORS[
              colorIdx % FORMS.ADMIN_PIE_CHART_COLORS.length
            ],
        };
        colorIdx++;
      }
    }
  });

  // update selected pie chart segment if the data changes
  useEffect(() => {
    const activeStillExists = raceOrEthnicityData.some(
      (item) => item.name === activeLevel,
    );

    if (raceOrEthnicityData.length <= 0) {
      setActiveLevel(null);
      return;
    } else if (!activeStillExists && raceOrEthnicityData[0]) {
      setActiveLevel(raceOrEthnicityData[0].name);
    }
  }, [raceOrEthnicityData, activeLevel]);

  return (
    <Card data-chart={id} className="flex flex-col pb-4">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Race / Ethnicity</CardTitle>
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
            {raceNames.map((key) => {
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
              data={raceOrEthnicityData}
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
                          {raceOrEthnicityData[
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
              {raceOrEthnicityData.map((_, index) => (
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
