"use client";

import { useEffect, useState } from "react";

import type { InsertHackathon } from "@forge/db/schemas/knight-hacks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

import { api } from "~/trpc/react";
import HackerCharts from "./HackerCharts";

export default function HackathonDataContent() {
  const { data: hackathons } = api.hackathon.getHackathons.useQuery();
  const [activeHackathon, setActiveHackathon] =
    useState<InsertHackathon | null>(null);

  useEffect(() => {
    if (!activeHackathon && hackathons?.length) {
      // Sort hackathons by start date descending to get the latest one
      const sortedHackathons = [...hackathons].sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
      setActiveHackathon(sortedHackathons[0] ?? null);
    }
  }, [hackathons, activeHackathon]);

  return (
    <div>
      <div className="mt-10 flex flex-col justify-between gap-4 md:flex-row-reverse lg:flex-row-reverse">
        <Select
          value={activeHackathon?.name ?? undefined}
          onValueChange={(name) => {
            const selectedHackathon =
              hackathons?.find((h) => h.name === name) ?? null;
            setActiveHackathon(selectedHackathon);
          }}
        >
          <SelectTrigger
            className="md:w-1/2 lg:w-1/2"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select a hackathon..." />
          </SelectTrigger>
          <SelectContent>
            {hackathons?.map((hackathon) => (
              <SelectItem key={hackathon.id} value={hackathon.name}>
                {hackathon.name}
                <span className="me-2" />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {activeHackathon?.name ?? ""}
        </h1>
      </div>
      {activeHackathon?.id && <HackerCharts hackathonId={activeHackathon.id} />}
    </div>
  );
}
