"use client";

import { api } from "~/trpc/react";
import type { InsertHackathon } from "@forge/db/schemas/knight-hacks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@forge/ui/select";
import { useEffect, useState } from "react";
import HackerCharts from "./HackerCharts";

export default function HackathonDataContent() {

    const { data: hackathons } = api.hackathon.getHackathons.useQuery();
    const [activeHackathon, setActiveHackathon] = useState<InsertHackathon | null>(null);

    useEffect(() => {
        if (!activeHackathon && hackathons?.length) {
            setActiveHackathon(hackathons[0] ?? null);
        }
    }, [hackathons, activeHackathon]);

    console.log(`active hackathon: ${activeHackathon ? activeHackathon.name : "it's null :("}`);

    return (
        <div>
            <div className="mt-10 flex flex-col gap-4 md:flex-row-reverse lg:flex-row-reverse justify-between">
                <Select value={activeHackathon?.name ?? undefined}
                onValueChange={(name) => {
                    const selectedHackathon = hackathons?.find(h => h.name === name) ?? null;
                    setActiveHackathon(selectedHackathon);
                }}            
                >
                    <SelectTrigger className="md:w-1/2 lg:w-1/2" aria-label="Select a value">
                        <SelectValue placeholder="Select hackathon" />
                    </SelectTrigger>
                    <SelectContent>
                        {
                            hackathons?.map((hackathon) => (
                                <SelectItem key={hackathon.id} value={hackathon.name}>
                                    {hackathon.name}
                                    <span className="me-2" />
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
                <h1 className="text-3xl font-extrabold tracking-tight">
                    {activeHackathon?.name ?? "Select a hackathon"}
                </h1>
            </div>
            {activeHackathon?.id && <HackerCharts hackathonId={activeHackathon.id} />}
        </div>
    )
}