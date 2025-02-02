"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@forge/ui/chart";
import type { InsertMember } from "@forge/db/schemas/knight-hacks";

type Member = InsertMember;
type ChartConfig = Record<string, {
    label: string;
    color?: string;
  }>;;

const PIE_COLORS = ["#f72585", "#b5179e", "#7209b7", "#3a0ca3", "#4361ee", "#4895ef", "#4cc9f0", "#560bad", "#480ca8"];

export default function GenderPie({ members } : { members:Member[] }) {
  // get amount of each gender
  const genderCounts: Record<string, number> = {};
  members.forEach(({ gender }) => {
    if (gender) genderCounts[gender] = (genderCounts[gender] ?? 0) + 1;
  });
  const genderData = Object.entries(genderCounts).map(([gender, count]) => ({
    name: gender,
    amount: count,
  }));

  // set up chart config
  const baseConfig: ChartConfig = {
    members: { label: "Members" },
  };
  let colorIdx = 0;
  members.forEach(({ gender }) => {
    if (gender && !baseConfig[gender]) {
      baseConfig[gender] = { label: gender, color: PIE_COLORS[colorIdx % PIE_COLORS.length]};
      colorIdx++;
    }
  });

    return (
        <Card>
          <CardHeader>
            <CardTitle>
              <text className="text-xl">Gender Distribution</text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={baseConfig} className="aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="members" hideLabel />} />
                <Pie data={genderData} dataKey="amount">
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={baseConfig[entry.name]?.color ?? "#ccc"} />
                  ))}
                </Pie>
                <ChartLegend 
                    content={<ChartLegendContent nameKey="name" />}
                    className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                  />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
    );
}