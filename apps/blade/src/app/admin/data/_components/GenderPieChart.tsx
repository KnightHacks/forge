"use client"

import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@forge/ui/chart"
const chartData = [
  { browser: "noAnswer", members: 275, fill: "#f72585" },
  { browser: "selfDescribe", members: 200, fill: "#b5179e" },
  { browser: "nonbinary", members: 187, fill: "#7209b7" },
  { browser: "woman", members: 173, fill: "#3a0ca3" },
  { browser: "man", members: 90, fill: "#4361ee" },
]

const chartConfig = {
  members: {
    label: "Members",
  },
  noAnswer: {
    label: "Prefer not to answer",
    color: "#f72585",
  },
  selfDescribe: {
    label: "Prefer to self-describe",
    color: "#b5179e",
  },
  nonbinary: {
    label: "Non-binary",
    color: "#7209b7",
  },
  woman: {
    label: "Woman",
    color: "#3a0ca3",
  },
  man: {
    label: "man",
    color: "#4361ee",
  },
} satisfies ChartConfig

export default function GenderPieChart() {
    return (
        <div>
            <h2 className="text-xl font-extrabold text-center">
                Gender Distribution
            </h2>
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
                <ChartTooltip
                content={<ChartTooltipContent nameKey="members" hideLabel />}
                />
              <Pie data={chartData} dataKey="members" />
              <ChartLegend
                content={<ChartLegendContent nameKey="browser" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
              />
            </PieChart>
          </ChartContainer>
      </div>
    );
}