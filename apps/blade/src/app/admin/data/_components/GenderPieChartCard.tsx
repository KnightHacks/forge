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

export default function GenderPieChartCard({ members } : { members:Member[] }) {
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
  const genderMap: Record<string, { label: string; color: string }> = {
    "Prefer not to disclose": { label: "Prefer not to answer", color: "#f72585" },
    "Prefer to self-describe": { label: "Prefer to self-describe", color: "#b5179e" },
    "Non-binary": { label: "Non-binary", color: "#7209b7" },
    "Woman": { label: "Woman", color: "#3a0ca3" },
    "Man": { label: "Man", color: "#4361ee" },
  };
  members.forEach(({ gender }) => {
    if (gender && !baseConfig[gender] && genderMap[gender]) {
      baseConfig[gender] = genderMap[gender];
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