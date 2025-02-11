"use client";

import type { InsertMember, ReturnEvent } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function EngagementInfo({members, events, numDuesPaying} : {members: InsertMember[], events: ReturnEvent[], numDuesPaying: number}) {
    const percentDuesPaying = numDuesPaying / members.length * 100;
    const attendances = events.reduce((sum, event) => sum + event.numAttended, 0);

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle className="text-xl">Club Engagement</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-row gap-4">
                    <p>
                        <span className="text-xl text-green-600 font-bold">{percentDuesPaying}% </span>
                        <span className="text-muted-foreground">paid dues.</span>
                    </p>
                    <p>
                        <span className="text-xl text-red-600 font-bold">{100-percentDuesPaying}% </span>
                        <span className="text-muted-foreground">haven't paid dues.</span>
                    </p>
                </div>
                <div className="flex flex-row gap-4">
                    <p>Average Events Attended: {events.length > 0 ? attendances / events.length : 0}</p>
                    <p>Average Points: 3</p>
                </div>
            </CardContent>
        </Card>
    );
}