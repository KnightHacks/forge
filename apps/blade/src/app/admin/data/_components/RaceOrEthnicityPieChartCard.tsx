"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

// import type { ChartConfig } from "@forge/ui/chart";
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

export default function RaceOrEthnicityPieChartCard({ members } : { members:Member[] }) {
  // get amount of each raceOrEthnicity
  const raceOrEthnicityCounts: Record<string, number> = {};
  members.forEach(({ raceOrEthnicity }) => {
    if (raceOrEthnicity) raceOrEthnicityCounts[raceOrEthnicity] = (raceOrEthnicityCounts[raceOrEthnicity] ?? 0) + 1;
  });
  const raceOrEthnicityData = Object.entries(raceOrEthnicityCounts).map(([raceOrEthnicity, count]) => ({
    name: raceOrEthnicity,
    amount: count,
  }));

  // set up chart config
  const baseConfig: ChartConfig = {
    members: { label: "Members" },
  };
  const raceOrEthnicityMap: Record<string, { label: string; color: string }> = {
    "Other": { label: "Other", color: "#f72585" },
    "Prefer not to answer": { label: "Prefer not to answer", color: "#b5179e" },
    "Middle Eastern": { label: "Middle Eastern", color: "#7209b7" },
    "Native American or Alaskan Native": { label: "Native American or Alaskan Native", color: "#3a0ca3" },
    "Native Hawaiian or Other Pacific Islander": { label: "Native Hawaiian or Other Pacific Islander", color: "#4361ee" },
    "Asian": { label: "Asian", color: "#4895ef" },
    "Hispanic / Latino / Spanish Origin": { label: "Hispanic / Latino / Spanish Origin", color: "#4cc9f0" },
    "Black or African American": { label: "Black or African American", color: "#560bad" }, 
    "White": { label: "White", color: "#480ca8" },
  };
  members.forEach(({ raceOrEthnicity }) => {
    if (raceOrEthnicity && !baseConfig[raceOrEthnicity] && raceOrEthnicityMap[raceOrEthnicity]) {
      baseConfig[raceOrEthnicity] = raceOrEthnicityMap[raceOrEthnicity];
    }
  });

    return (
        <Card>
          <CardHeader>
            <CardTitle>
              <text className="text-xl">Race / Ethnicity Distribution</text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={baseConfig} className="aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="members" hideLabel />} />
                <Pie data={raceOrEthnicityData} dataKey="amount">
                  {raceOrEthnicityData.map((entry, index) => (
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