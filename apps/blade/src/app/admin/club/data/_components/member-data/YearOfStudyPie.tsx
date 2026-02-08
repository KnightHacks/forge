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
import { FORMS } from '@forge/consts';

interface Member {
  gradDate: Date | string;
  levelOfStudy: string;
}

interface YearOfStudyPieProps {
  members: Member[];
}

export default function YearOfStudyPie({ members }: YearOfStudyPieProps) {
  const id = "pie-interactive";

  // Calculate year of study based on graduation date relative to current date
  const calculateYearOfStudy = (
    gradDate: Date | string,
    member: Member,
  ): string => {
    // Convert gradDate to Date object if it's a string
    const gradDateObj =
      typeof gradDate === "string" ? new Date(gradDate) : gradDate;
    const currentDate = new Date();

    // Check if dates are valid
    if (isNaN(gradDateObj.getTime())) {
      return "Unknown";
    }

    const gradYear = gradDateObj.getFullYear();
    const currentYear = currentDate.getFullYear();
    const yearsUntilGrad = gradYear - currentYear;

    // Check for high school students - but use graduation date logic if they've graduated
    if (
      member.levelOfStudy === "Less than Secondary / High School" ||
      member.levelOfStudy === "Secondary / High School"
    ) {
      // If their HS graduation date has passed, classify them based on years since graduation
      if (yearsUntilGrad < 0) {
        const yearsSinceHSGrad = Math.abs(yearsUntilGrad);
        if (yearsSinceHSGrad <= 1) return "Freshman";
        if (yearsSinceHSGrad <= 2) return "Sophomore";
        if (yearsSinceHSGrad <= 3) return "Junior";
        if (yearsSinceHSGrad <= 4) return "Senior";
        return "Alumni"; // 5+ years since HS graduation
      }
      // Still in high school
      return "High School";
    }

    // Check for graduate students (Masters, PhD, etc.)
    if (
      member.levelOfStudy ===
        "Graduate University (Masters, Professional, Doctoral, etc)" ||
      member.levelOfStudy === "Post Doctorate"
    ) {
      return "Graduate";
    }

    // If graduation date has passed, they are alumni
    if (yearsUntilGrad < 0) return "Alumni";

    // Current year graduates are still seniors until they actually graduate
    if (yearsUntilGrad === 0) return "Senior";
    if (yearsUntilGrad === 1) return "Senior";
    if (yearsUntilGrad === 2) return "Junior";
    if (yearsUntilGrad === 3) return "Sophomore";
    if (yearsUntilGrad >= 4) return "Freshman";

    return "Unknown";
  };

  // Get amount of each year
  const yearCounts: Record<string, number> = {};
  members.forEach((member) => {
    if (member.gradDate) {
      const year = calculateYearOfStudy(member.gradDate, member);
      yearCounts[year] = (yearCounts[year] ?? 0) + 1;
    }
  });

  const yearData = Object.entries(yearCounts).map(([year, count]) => ({
    name: year,
    amount: count,
  }));

  const [activeYear, setActiveYear] = useState(
    yearData[0] ? yearData[0].name : null,
  );

  const activeIndex = useMemo(
    () => yearData.findIndex((item) => item.name === activeYear),
    [activeYear, yearData],
  );

  const yearNames = useMemo(
    () => yearData.map((item) => item.name),
    [yearData],
  );

  // Set up chart config
  const baseConfig: ChartConfig = {
    people: { label: "people" },
  };
  let colorIdx = 0;
  yearData.forEach(({ name }) => {
    if (!baseConfig[name]) {
      baseConfig[name] = {
        label: name,
        color: FORMS.ADMIN_PIE_CHART_COLORS[colorIdx % FORMS.ADMIN_PIE_CHART_COLORS.length],
      };
      colorIdx++;
    }
  });

  // Update selected pie chart segment if the data changes
  useEffect(() => {
    const activeStillExists = yearData.some((item) => item.name === activeYear);

    if (yearData.length <= 0) {
      setActiveYear(null);
      return;
    } else if (!activeStillExists && yearData[0]) {
      setActiveYear(yearData[0].name);
    }
  }, [yearData, activeYear]);

  return (
    <Card data-chart={id} className="flex flex-col pb-4">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Year of Study</CardTitle>
        </div>
        <Select
          value={activeYear ? activeYear : undefined}
          onValueChange={setActiveYear}
        >
          <SelectTrigger
            className="ml-auto h-7 rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {yearNames.map((key) => {
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
              data={yearData}
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
                          {yearData[activeIndex]?.amount.toLocaleString()}
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
              {yearData.map((_, index) => (
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
