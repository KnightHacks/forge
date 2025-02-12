"use client";

import { Star } from "lucide-react";
import type { InsertMember, ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function EngagementInfo({members, events, numDuesPaying} : {members: InsertMember[], events: ReturnEvent[], numDuesPaying: number}) {
    const percentDuesPaying = numDuesPaying / members.length * 100;
    const attendances = events.reduce((sum, event) => sum + event.numAttended, 0);
    const avgPoints = members.length > 0 ? 
        members.reduce((sum, member) => sum + (member.points ? member.points : 0), 0) / members.length
        : 0;

    return (
        <Card className="lg:col-span-2 md:col-span-2">
            <CardHeader>
                <CardTitle className="text-xl">Club Engagement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 lg:flex-row md:flex-row lg:gap-4 md:gap-4">
                    <p>
                        <span className="text-xl text-green-600 font-bold">{percentDuesPaying}% </span>
                        <span className="text-muted-foreground">paid dues.</span>
                    </p>
                    <p>
                        <span className="text-xl text-red-600 font-bold">{100-percentDuesPaying}% </span>
                        <span className="text-muted-foreground">haven't paid dues.</span>
                    </p>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row md:flex-row lg:gap-4 md:gap-4">
                    <p>
                        Average Events Attended: 
                        <span className="font-bold"> {events.length > 0 ? attendances / events.length : 0}</span>
                    </p>
                    <p>
                        Average Points: <span className="font-bold">{avgPoints}</span>
                        <Star className="inline-block h-5 w-5 ms-1 text-yellow-500 relative bottom-0.5" /> 
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}