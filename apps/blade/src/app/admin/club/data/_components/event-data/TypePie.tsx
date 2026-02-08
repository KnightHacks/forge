"use client";

import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { useEffect, useMemo, useState } from "react";
import { Cell, Label, Pie, PieChart, Sector } from "recharts";

import type { ReturnEvent } from "@forge/db/schemas/knight-hacks";
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

/**
 * Render an interactive pie chart that visualizes the distribution of events grouped by tag.
 *
 * Aggregates the provided events by their `tag` field, computes counts and percentages for each
 * tag, and renders a selectable card containing a pie chart with a center label showing the
 * active slice's percentage.
 *
 * @param events - Array of events whose `tag` values will be counted and displayed
 * @returns The JSX element rendering a selectable pie chart summary of event types by tag
 */
export default function TypePie({ events }: { events: ReturnEvent[] }) {
  const id = "pie-interactive";

  // get amount of each tag
  const tagCounts: Record<string, number> = {};
  events.forEach(({ tag }) => {
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  });

  const totalEvents = Object.values(tagCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const tagData = Object.entries(tagCounts).map(([tag, count]) => ({
    name: tag,
    amount: count,
    percentage: (totalEvents > 0 ? (count / totalEvents) * 100 : 0).toFixed(2),
  }));

  const [activeLevel, setActiveLevel] = useState(
    tagData[0] ? tagData[0].name : null,
  );

  const activeIndex = useMemo(
    () => tagData.findIndex((item) => item.name === activeLevel),
    [activeLevel, tagData],
  );
  const tags = useMemo(() => tagData.map((item) => item.name), [tagData]);

  useEffect(() => {
    if (!tagData.some((item) => item.name === activeLevel)) {
      setActiveLevel(tagData[0]?.name ?? null);
    }
  }, [tagData, activeLevel]);

  // set up chart config
  const baseConfig: ChartConfig = {
    events: { label: "events" },
  };
  let colorIdx = 0;
  events.forEach(({ tag }) => {
    if (!baseConfig[tag]) {
      baseConfig[tag] = {
        label: tag,
        color: FORMS.ADMIN_PIE_CHART_COLORS[colorIdx % FORMS.ADMIN_PIE_CHART_COLORS.length],
      };
      colorIdx++;
    }
  });

  return (
    <Card data-chart={id} className="flex flex-col">
      <ChartStyle id={id} config={baseConfig} />
      <CardHeader className="flex-col items-start gap-4 space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle className="text-xl">Event Types</CardTitle>
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
            {tags.map((key) => {
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
              data={tagData}
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
                          className="fill-foreground text-2xl font-bold"
                        >
                          {tagData[activeIndex]?.percentage.toLocaleString()}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Events
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
              {tagData.map((_, index) => (
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