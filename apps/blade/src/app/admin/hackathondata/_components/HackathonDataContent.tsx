"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@forge/ui/select";
import { useState } from "react";

const TEMP_HACKATHONS = ["silly", "weird", "unconventional", "bizarre", "knight hacks VIII the fourth jr."];

export default function HackathonDataContent() {
    const [activeHackathon, setActiveHackathon] = useState(TEMP_HACKATHONS[0]);

    return (
        <div className="mt-10 flex flex-col gap-4 md:flex-row-reverse lg:flex-row-reverse justify-between">
            <Select value={activeHackathon ? activeHackathon : undefined}
            onValueChange={setActiveHackathon}>
                <SelectTrigger className="md:w-1/2 lg:w-1/2" aria-label="Select a value">
                    <SelectValue placeholder="Select hackathon" />
                </SelectTrigger>
                <SelectContent>
                    {
                        TEMP_HACKATHONS.map((key) => <SelectItem key={key} value={key}>
                            <div>
                                {key}
                                <span
                                className="me-2"
                                />
                            </div>
                        </SelectItem>)
                    }
                </SelectContent>
            </Select>
            <h1 className="text-3xl font-extrabold tracking-tight">
                {activeHackathon}
            </h1>
        </div>
    )
}