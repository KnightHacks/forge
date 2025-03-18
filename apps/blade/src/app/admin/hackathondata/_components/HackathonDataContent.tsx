"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@forge/ui/select";
import { useState } from "react";

const TEMP_HACKATHONS = ["silly", "weird", "unconventional", "bizarre"];

export default function HackathonDataContent() {
    const [activeHackathon, setActiveHackathon] = useState(TEMP_HACKATHONS[0]);

    return (
        <div className="mt-10 flex">
            <h1 className="text-3xl font-extrabold tracking-tight">
                {activeHackathon} Data
            </h1>
            <Select value={activeHackathon ? activeHackathon : undefined}
            onValueChange={setActiveHackathon}>
                <SelectTrigger className="ml-auto h-7 rounded-lg pl-2.5" aria-label="Select a value">
                    <SelectValue placeholder="Select hackathon" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl">
                    {
                        TEMP_HACKATHONS.map((key) => <SelectItem key={key} value={key} className="rounded-lg h[&_span]:flex">
                            <div className="flex items-center gap-2 text-xs">
                                <span
                                className="flex h-3 w-3 shrink-0 rounded-sm"
                                />
                                {key}
                            </div>
                        </SelectItem>)
                    }
                </SelectContent>
            </Select>
        </div>
    )
}