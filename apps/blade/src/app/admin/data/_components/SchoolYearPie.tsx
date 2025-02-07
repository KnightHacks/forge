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

export default function SchoolYearPie({ members } : { members:Member[] }) {
  // get amount of each levelOfStudy
  const levelOfStudyCounts: Record<string, number> = {};
  members.forEach(({ levelOfStudy }) => {
    levelOfStudyCounts[levelOfStudy] = (levelOfStudyCounts[levelOfStudy] ?? 0) + 1;
  });
  const levelOfStudyData = Object.entries(levelOfStudyCounts).map(([levelOfStudy, count]) => ({
    name: levelOfStudy,
    amount: count,
  }));

  // set up chart config
  const baseConfig: ChartConfig = {
    members: { label: "Members" },
  };
  let colorIdx = 0;
  members.forEach(({ levelOfStudy }) => {
    if (!baseConfig[levelOfStudy]) {
      baseConfig[levelOfStudy] = { label: levelOfStudy, color: PIE_COLORS[colorIdx % PIE_COLORS.length]};
      colorIdx++;
    }
  });

    return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">School Year Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={baseConfig} className="aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="members" hideLabel />} />
                <Pie data={levelOfStudyData} dataKey="amount">
                  {levelOfStudyData.map((entry, index) => (
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