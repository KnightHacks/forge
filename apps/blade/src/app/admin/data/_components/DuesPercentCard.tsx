"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function DuesPercentCard({numMembers, numDuesPaying} : {numMembers: number, numDuesPaying: number}) {
    const percentDuesPaying = numDuesPaying / numMembers * 100;

    return (
        <Card>
            <CardHeader>
                <CardTitle><text className="text-xl">Dues Payment</text></CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-row gap-4">
                    <text>
                        <span className="text-xl text-green-600 font-bold">{percentDuesPaying}% </span>
                        <span className="text-muted-foreground">paid dues.</span>
                    </text>
                    <text>
                        <span className="text-xl text-red-600 font-bold">{100-percentDuesPaying}% </span>
                        <span className="text-muted-foreground">haven't paid dues.</span>
                    </text>
                </div>
            </CardContent>
        </Card>
    );
}