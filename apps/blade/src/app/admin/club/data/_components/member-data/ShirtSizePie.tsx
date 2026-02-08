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

interface Member {
  shirtSize?: (typeof FORMS.SHIRT_SIZES)[number];
}

export default function ShirtSizePie({ members }: { members: Member[] }) {
  const id = "pie-interactive-shirt";

  // set up shirt size data
  const shirtSizeCounts: Record<string, number> = {};
  members.forEach(({ shirtSize }) => {
    if (shirtSize) {
      shirtSizeCounts[shirtSize] = (shirtSizeCounts[shirtSize] ?? 0) + 1;
    }
  });

  const shirtSizeData = Object.entries(shirtSizeCounts).map(
    ([shirtSize, count]) => ({
      name: shirtSize,
      amount: count,
    }),
  );

  const [activeSize, setActiveSize] = useState(
    shirtSizeData[0] ? shirtSizeData[0].name : null,
  );

  const activeIndex = useMemo(
    () => shirtSizeData.findIndex((item) => item.name === activeSize),
    [activeSize, shirtSizeData],
  );
  const shirtSizes = useMemo(
    () => shirtSizeData.map((item) => item.name),
    [shirtSizeData],
  );

  // set up chart config
  const baseConfig: ChartConfig = {
    members: { label: "members" },
  };
  let colorIdx = 0;
  members.forEach(({ shirtSize }) => {
    if (shirtSize && !baseConfig[shirtSize]) {
      baseConfig[shirtSize] = {
        label: shirtSize,
        color:
          FORMS.ADMIN_PIE_CHART_COLORS[
            colorIdx % FORMS.ADMIN_PIE_CHART_COLORS.length
          ],
      };
      colorIdx++;
    }
  });

  // update selected pie chart segment if the data changes
  useEffect(() => {
    const activeStillExists = shirtSizeData.some(
      (item) => item.name === activeSize,
    );

    if (shirtSizeData.length <= 0) {
      setActiveSize(null);
      return;
    } else if (!activeStillExists && shirtSizeData[0]) {
      setActiveSize(shirtSizeData[0].name);
    }
  }, [shirtSizeData, activeSize]);

  return (
    <Card data-chart={id} className="flex flex-col pb-4">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Shirt Sizes</CardTitle>
        </div>
        <Select
          value={activeSize ? activeSize : undefined}
          onValueChange={setActiveSize}
        >
          <SelectTrigger
            className="ml-auto h-7 rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {shirtSizes.map((key) => {
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
              data={shirtSizeData}
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
                          {shirtSizeData[activeIndex]?.amount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          members
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
              {shirtSizeData.map((_, index) => (
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
